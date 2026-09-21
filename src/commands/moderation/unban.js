import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed } from "../../core/embeds.js";
import { EMOJIS } from "../../core/emojis.js";
import { sendModLog } from "../../utils/modLog.js";

const slashBuilder = new SlashCommandBuilder()
  .setName("unban")
  .setDescription("Unban a previously banned user from the server")
  .addStringOption((opt) => opt.setName("userid").setDescription("The Discord ID of the user to unban").setRequired(true))
  .addStringOption((opt) => opt.setName("reason").setDescription("Reason for unbanning").setRequired(false));

export default createCommand({
  name: "unban",
  description: "Unban a previously banned user from the server",
  category: "Moderation",
  modOnly: true,
  requiredPermission: PermissionFlagsBits.BanMembers,
  slashBuilder,

  async execute(ctx) {
    const { guild, user } = ctx;
    if (!guild) return;

    const targetUserId = ctx.options.userid || ctx.options._args?.[0];
    const reason = ctx.options.reason || ctx.options._args?.slice(1).join(" ") || "No reason provided";

    if (!targetUserId) {
      return await ctx.reply({ content: "Please provide a valid user ID.", ephemeral: true });
    }

    const unbanned = await guild.bans.remove(targetUserId, reason).catch(() => null);
    if (!unbanned) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Unban Failed",
            description: `${EMOJIS.get("fail") || "❌"} Could not find an active ban for user ID \`${targetUserId}\`.`,
            level: "ERROR",
          }),
        ],
        ephemeral: true,
      });
    }

    await sendModLog({
      guild,
      category: "MODERATION",
      title: "Member Unbanned",
      description: `User <@${targetUserId}> was unbanned by <@${user.id}>.`,
      level: "INFO",
      actor: user,
      extraFields: { Target: `<@${targetUserId}> (\`${targetUserId}\`)` },
    });

    return await ctx.reply({
      embeds: [
        makeEmbed({
          title: "Member Unbanned",
          description: `${EMOJIS.get("success") || "✅"} Successfully unbanned <@${targetUserId}>.`,
          level: "SUCCESS",
        }),
      ],
    });
  },
});
