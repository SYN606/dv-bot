import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed, COLORS } from "../../core/embeds.js";
import { EMOJIS } from "../../core/emojis.js";
import { lockChannel, unlockChannel, parseDuration } from "../../services/channelLockService.js";

const slashBuilder = new SlashCommandBuilder()
  .setName("lock")
  .setDescription("Lock or unlock a channel — verification-aware (targets verified role if configured)")
  .addStringOption((opt) =>
    opt
      .setName("action")
      .setDescription("Lock or Unlock")
      .setRequired(true)
      .addChoices(
        { name: "Lock", value: "lock" },
        { name: "Unlock", value: "unlock" }
      )
  )
  .addStringOption((opt) =>
    opt.setName("duration").setDescription("Optional timed duration (e.g. 10m, 1h, 1d)").setRequired(false)
  )
  .addChannelOption((opt) => opt.setName("channel").setDescription("Target channel").setRequired(false));

export default createCommand({
  name: "lock",
  description: "Lock or unlock a channel — verification-aware",
  category: "Channels",
  aliases: ["unlock"],
  modOnly: true,
  requiredPermission: PermissionFlagsBits.ManageChannels,
  slashBuilder,

  async execute(ctx) {
    const { guild, channel, user } = ctx;
    if (!guild) return;

    // Resolve action (lock vs unlock)
    let action = ctx.options.action || "lock";
    const invokedName = ctx.message?.content?.trim().split(/\s+/)[0]?.toLowerCase().replace(/^[^\w]*/, "");
    if (
      ctx.command?.name === "unlock" ||
      invokedName === "unlock" ||
      ctx.options._args?.[0]?.toLowerCase() === "unlock"
    ) {
      action = "unlock";
    }

    const targetChannel =
      ctx.options.channel ? guild.channels.cache.get(ctx.options.channel) || channel : channel;

    if (action === "lock") {
      let durationStr = ctx.options.duration;
      if (!durationStr && ctx.options._args) {
        for (const arg of ctx.options._args) {
          if (parseDuration(arg)) { durationStr = arg; break; }
        }
      }

      const res = await lockChannel({
        channel: targetChannel,
        guild,
        moderator: user,
        durationStr,
      });

      const roleLabel = res.usingVerifiedRole
        ? `\`@${res.verifiedRoleName}\` (verified members)`
        : "`@everyone`";
      const scopeNote = res.usingVerifiedRole
        ? `-# 🔐 Verification mode active — targeting **@${res.verifiedRoleName}** instead of @everyone.`
        : `-# 🌐 No verification role configured — targeting **@everyone**.`;

      let expiryDesc = "";
      if (res.expiryUnix) {
        expiryDesc = `\n${EMOJIS.get("arrow_point") || "➡️"} **Auto-Unlocks:** <t:${res.expiryUnix}:R>`;
      }

      return await ctx.reply({
        embeds: [
          makeEmbed({
            author: { name: "Channel Lockdown", iconURL: guild.iconURL?.({ dynamic: true }) || undefined },
            title: "🔒 Channel Locked",
            description:
              `${targetChannel} has been **locked** — ${roleLabel} cannot send messages.\n` +
              (res.expiryUnix ? `${expiryDesc}\n` : "") +
              `\n${scopeNote}`,
            level: "WARNING",
            color: COLORS.DARK,
            headerDivider: false,
          }),
        ],
      });
    }

    if (action === "unlock") {
      const res = await unlockChannel({
        channel: targetChannel,
        guild,
        moderator: user,
      });

      const roleLabel = res.usingVerifiedRole
        ? `\`@${res.verifiedRoleName}\` (verified members)`
        : "`@everyone`";
      const scopeNote = res.usingVerifiedRole
        ? `-# 🔐 Verification mode active — targeting **@${res.verifiedRoleName}** instead of @everyone.`
        : `-# 🌐 No verification role configured — targeting **@everyone**.`;

      return await ctx.reply({
        embeds: [
          makeEmbed({
            author: { name: "Channel Lockdown", iconURL: guild.iconURL?.({ dynamic: true }) || undefined },
            title: "🔓 Channel Unlocked",
            description:
              `${targetChannel} has been **unlocked** — ${roleLabel} can send messages again.\n\n${scopeNote}`,
            level: "SUCCESS",
            color: COLORS.DARK,
            headerDivider: false,
          }),
        ],
      });
    }
  },
});
