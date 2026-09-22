import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed, COLORS } from "../../core/embeds.js";
import { EMOJIS } from "../../core/emojis.js";
import { ChannelPermissionSnapshot, VerificationConfig } from "../../db/models/index.js";
import { sendModLog } from "../../utils/modLog.js";

const unlockTimers = new Map(); // channelId → Timeout

function parseDuration(str) {
  if (!str) return null;
  const match = String(str).trim().match(/^(\d+)\s*([smhd])$/i);
  if (!match) return null;
  const num = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  if (isNaN(num) || num <= 0) return null;
  switch (unit) {
    case "s": return num;
    case "m": return num * 60;
    case "h": return num * 3600;
    case "d": return num * 86400;
    default: return null;
  }
}

/**
 * Resolve the role to lock/unlock against:
 * - If verification is enabled and has verified_role_id → target that role
 * - Otherwise → fall back to @everyone
 *
 * Returns { role, usingVerifiedRole: boolean, verifiedRoleName: string|null }
 */
async function resolveTargetRole(guild) {
  try {
    const vConfig = await VerificationConfig.findByPk(String(guild.id));
    if (vConfig && vConfig.enabled && vConfig.verified_role_id) {
      const verifiedRole = guild.roles.cache.get(String(vConfig.verified_role_id));
      if (verifiedRole) {
        return { role: verifiedRole, usingVerifiedRole: true, verifiedRoleName: verifiedRole.name };
      }
    }
  } catch (_) {}
  return { role: guild.roles.everyone, usingVerifiedRole: false, verifiedRoleName: null };
}

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

    // ── Resolve action ────────────────────────────────────────────────────
    let action = ctx.options.action || "lock";
    const invokedName = ctx.message?.content?.trim().split(/\s+/)[0]?.toLowerCase().replace(/^[^\w]*/, "");
    if (
      ctx.command?.name === "unlock" ||
      invokedName === "unlock" ||
      ctx.options._args?.[0]?.toLowerCase() === "unlock"
    ) {
      action = "unlock";
    }

    // ── Resolve target channel ────────────────────────────────────────────
    const targetChannel =
      ctx.options.channel ? guild.channels.cache.get(ctx.options.channel) || channel : channel;

    // ── Resolve target role (verification-aware) ──────────────────────────
    const { role: targetRole, usingVerifiedRole, verifiedRoleName } = await resolveTargetRole(guild);
    const roleLabel = usingVerifiedRole
      ? `\`@${verifiedRoleName}\` (verified members)`
      : "`@everyone`";
    const scopeNote = usingVerifiedRole
      ? `-# 🔐 Verification mode active — targeting **@${verifiedRoleName}** instead of @everyone.`
      : `-# 🌐 No verification role configured — targeting **@everyone**.`;

    // ─────────────────────────────────────────────────────────────────────
    // LOCK
    // ─────────────────────────────────────────────────────────────────────
    if (action === "lock") {
      // Parse duration
      let durationStr = ctx.options.duration;
      if (!durationStr && ctx.options._args) {
        for (const arg of ctx.options._args) {
          if (parseDuration(arg)) { durationStr = arg; break; }
        }
      }
      const durationSeconds = parseDuration(durationStr);

      // Snapshot existing SendMessages perm for this role before overwriting
      const existingOverwrite = targetChannel.permissionOverwrites.cache.get(targetRole.id);
      const prevSendMessages =
        existingOverwrite?.allow.has(PermissionFlagsBits.SendMessages) ? true
        : existingOverwrite?.deny.has(PermissionFlagsBits.SendMessages) ? false
        : null;
      const prevAddReactions =
        existingOverwrite?.allow.has(PermissionFlagsBits.AddReactions) ? true
        : existingOverwrite?.deny.has(PermissionFlagsBits.AddReactions) ? false
        : null;

      // Upsert snapshot for SendMessages
      await ChannelPermissionSnapshot.findOrCreate({
        where: {
          guild_id: String(guild.id),
          channel_id: String(targetChannel.id),
          target_id: String(targetRole.id),
          permission_name: "SendMessages",
        },
        defaults: {
          guild_id: String(guild.id),
          channel_id: String(targetChannel.id),
          target_id: String(targetRole.id),
          permission_name: "SendMessages",
          permission_value: prevSendMessages,
        },
      });

      // Apply lock
      await targetChannel.permissionOverwrites.edit(targetRole, {
        SendMessages: false,
        AddReactions: false,
      });

      // Clear existing auto-unlock timer
      if (unlockTimers.has(targetChannel.id)) {
        clearTimeout(unlockTimers.get(targetChannel.id));
        unlockTimers.delete(targetChannel.id);
      }

      let expiryDesc = "";
      if (durationSeconds) {
        const expiryUnix = Math.floor(Date.now() / 1000) + durationSeconds;
        expiryDesc = `\n${EMOJIS.get("arrow_point") || "➡️"} **Auto-Unlocks:** <t:${expiryUnix}:R>`;

        const timer = setTimeout(async () => {
          unlockTimers.delete(targetChannel.id);
          try {
            // Restore from snapshot on auto-unlock
            const snap = await ChannelPermissionSnapshot.findOne({
              where: {
                guild_id: String(guild.id),
                channel_id: String(targetChannel.id),
                target_id: String(targetRole.id),
                permission_name: "SendMessages",
              },
            });
            await targetChannel.permissionOverwrites.edit(targetRole, {
              SendMessages: snap ? snap.permission_value : null,
              AddReactions: null,
            });
            if (snap) await snap.destroy().catch(() => {});

            await targetChannel.send({
              embeds: [
                makeEmbed({
                  title: "Channel Unlocked",
                  description: `${EMOJIS.get("success") || "🔓"} Temporary lockdown expired. Normal messaging has been restored for ${roleLabel}.`,
                  level: "SUCCESS",
                  color: COLORS.DARK,
                  headerDivider: false,
                }),
              ],
            }).catch(() => {});
          } catch (err) {
            console.error("[AUTO UNLOCK ERROR]:", err);
          }
        }, durationSeconds * 1000);

        unlockTimers.set(targetChannel.id, timer);
      }

      await sendModLog({
        guild,
        category: "MODERATION",
        title: "Channel Locked",
        description: `${targetChannel} locked by <@${user.id}>. Targeting: ${roleLabel}${durationSeconds ? ` | Duration: ${durationStr}` : ""}`,
        level: "WARNING",
        actor: user,
        extraFields: { "Target Role": usingVerifiedRole ? verifiedRoleName : "@everyone", Channel: `#${targetChannel.name}` },
      });

      return await ctx.reply({
        embeds: [
          makeEmbed({
            author: { name: "Channel Lockdown", iconURL: guild.iconURL?.({ dynamic: true }) || undefined },
            title: "🔒 Channel Locked",
            description:
              `${targetChannel} has been **locked** — ${roleLabel} cannot send messages.\n` +
              (durationSeconds ? `${expiryDesc}\n` : "") +
              `\n${scopeNote}`,
            level: "WARNING",
            color: COLORS.DARK,
            headerDivider: false,
          }),
        ],
      });
    }

    // ─────────────────────────────────────────────────────────────────────
    // UNLOCK
    // ─────────────────────────────────────────────────────────────────────
    if (action === "unlock") {
      // Clear any running timer
      if (unlockTimers.has(targetChannel.id)) {
        clearTimeout(unlockTimers.get(targetChannel.id));
        unlockTimers.delete(targetChannel.id);
      }

      // Restore from snapshot if available
      const snap = await ChannelPermissionSnapshot.findOne({
        where: {
          guild_id: String(guild.id),
          channel_id: String(targetChannel.id),
          target_id: String(targetRole.id),
          permission_name: "SendMessages",
        },
      });

      await targetChannel.permissionOverwrites.edit(targetRole, {
        SendMessages: snap ? snap.permission_value : null,
        AddReactions: null,
      });

      if (snap) await snap.destroy().catch(() => {});

      await sendModLog({
        guild,
        category: "MODERATION",
        title: "Channel Unlocked",
        description: `${targetChannel} unlocked by <@${user.id}>. Targeting: ${roleLabel}`,
        level: "INFO",
        actor: user,
        extraFields: { "Target Role": usingVerifiedRole ? verifiedRoleName : "@everyone", Channel: `#${targetChannel.name}` },
      });

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
