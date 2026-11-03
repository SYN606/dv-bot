import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed } from "../../core/embeds.js";
import { EMOJIS } from "../../core/emojis.js";
import { ModerationService } from "../../services/index.js";

const slashBuilder = new SlashCommandBuilder()
  .setName("unban")
  .setDescription("Unban a previously banned user from the server")
  .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
  .setDMPermission(false)
  .addStringOption((opt) => opt.setName("userid").setDescription("The Discord ID of the user to unban").setRequired(true))
  .addStringOption((opt) => opt.setName("reason").setDescription("Reason for unbanning").setRequired(false));

export default createCommand({
  name: "unban",
  description: "Unban a previously banned user from the server",
  category: "Moderation",
  aliases: ["ub"],
  usage: "<userid> [reason]",
  examples: [
    "/unban userid:123456789012345678 reason:Appeal approved",
    "dvunban 123456789012345678 Mistake ban",
  ],
  modOnly: true,
  requiredPermission: PermissionFlagsBits.BanMembers,
  slashBuilder,

  async execute(ctx) {
    const { guild, user } = ctx;
    if (!guild) return;

    const rawTarget = ctx.options.userid || ctx.options._args?.[0];
    const targetUserId = rawTarget?.match(/\d{17,20}/)?.[0];
    const reason = ctx.options.reason || ctx.options._args?.slice(1).join(" ") || "No reason provided";

    if (!targetUserId) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Invalid User ID",
            description: `${EMOJIS.get("fail") || "❌"} Please provide a valid Discord user ID (17-20 digits).`,
            level: "ERROR",
          }),
        ],
        ephemeral: true,
      });
    }

    const botMember = guild.members.me || (await guild.members.fetchMe().catch(() => null));
    if (!botMember?.permissions.has(PermissionFlagsBits.BanMembers)) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Missing Permissions",
            description: `${EMOJIS.get("fail") || "❌"} I lack the \`Ban Members\` permission to unban users.`,
            level: "ERROR",
          }),
        ],
        ephemeral: true,
      });
    }

    await ctx.defer({ ephemeral: false });

    try {
      await ModerationService.executeUnban({
        guild,
        moderator: user,
        targetUserId,
        reason,
      });

      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Member Unbanned",
            description: `${EMOJIS.get("success") || "✅"} Successfully unbanned <@${targetUserId}> (\`${targetUserId}\`).\n\n📌 **Reason:** ${reason}`,
            level: "SUCCESS",
          }),
        ],
      });
    } catch (err: any) {
      const isUnknownBan = err?.code === 10026 || err?.message?.toLowerCase().includes("unknown ban");
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Unban Failed",
            description: isUnknownBan
              ? `${EMOJIS.get("fail") || "❌"} Could not find an active ban for user ID \`${targetUserId}\`.`
              : `${EMOJIS.get("fail") || "❌"} Failed to unban: ${err?.message || "Unknown error"}`,
            level: "ERROR",
          }),
        ],
        ephemeral: true,
      });
    }
  },
});
