import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed, COLORS } from "../../core/embeds.js";
import { EMOJIS } from "../../core/emojis.js";
import { ChannelPermissionSnapshot, VerificationConfig } from "../../db/models/index.js";
import { sendModLog } from "../../utils/modLog.js";

/**
 * Resolve the role to hide/unhide against:
 * - If verification is enabled with verified_role_id → target that role
 * - Otherwise → fall back to @everyone
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
  .setName("hide")
  .setDescription("Hide or unhide a channel — verification-aware (targets verified role if configured)")
  .addStringOption((opt) =>
    opt
      .setName("action")
      .setDescription("Hide or Unhide")
      .setRequired(true)
      .addChoices(
        { name: "Hide", value: "hide" },
        { name: "Unhide", value: "unhide" }
      )
  )
  .addChannelOption((opt) =>
    opt.setName("channel").setDescription("Target channel (defaults to current)").setRequired(false)
  );

export default createCommand({
  name: "hide",
  description: "Hide or unhide a channel — verification-aware",
  category: "Channels",
  aliases: ["unhide"],
  modOnly: true,
  requiredPermission: PermissionFlagsBits.ManageChannels,
  slashBuilder,

  async execute(ctx) {
    const { guild, channel, user } = ctx;
    if (!guild) return;

    // ── Resolve action ────────────────────────────────────────────────────
    let action = ctx.options.action || "hide";
    const invokedName = ctx.message?.content?.trim().split(/\s+/)[0]?.toLowerCase().replace(/^[^\w]*/, "");
    if (
      ctx.command?.name === "unhide" ||
      invokedName === "unhide" ||
      ctx.options._args?.[0]?.toLowerCase() === "unhide"
    ) {
      action = "unhide";
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
    // HIDE
    // ─────────────────────────────────────────────────────────────────────
    if (action === "hide") {
      // Check if already snapshotted (i.e. already hidden for this role)
      const existingSnapshot = await ChannelPermissionSnapshot.findOne({
        where: {
          guild_id: String(guild.id),
          channel_id: String(targetChannel.id),
          target_id: String(targetRole.id),
          permission_name: "ViewChannel",
        },
      });

      if (existingSnapshot) {
        return await ctx.reply({
          embeds: [
            makeEmbed({
              title: "Already Hidden",
              description:
                `${EMOJIS.get("warning") || "⚠️"} ${targetChannel} is already hidden from ${roleLabel}.\n\n` +
                `Use \`/hide unhide\` or \`tsunhide\` to restore it.`,
              level: "WARNING",
              color: COLORS.DARK,
              headerDivider: false,
            }),
          ],
          ephemeral: true,
        });
      }

      // Snapshot the current ViewChannel value for this role before overwriting
      const currentOverwrite = targetChannel.permissionOverwrites.cache.get(targetRole.id);
      const prevViewChannel =
        currentOverwrite?.allow.has(PermissionFlagsBits.ViewChannel) ? true
        : currentOverwrite?.deny.has(PermissionFlagsBits.ViewChannel) ? false
        : null;

      await ChannelPermissionSnapshot.create({
        guild_id: String(guild.id),
        channel_id: String(targetChannel.id),
        target_id: String(targetRole.id),
        permission_name: "ViewChannel",
        permission_value: prevViewChannel,
      });

      // Apply hide
      await targetChannel.permissionOverwrites.edit(targetRole, {
        ViewChannel: false,
      });

      await sendModLog({
        guild,
        category: "MODERATION",
        title: "Channel Hidden",
        description: `${targetChannel} hidden from ${roleLabel} by <@${user.id}>.`,
        level: "WARNING",
        actor: user,
        extraFields: {
          "Target Role": usingVerifiedRole ? verifiedRoleName : "@everyone",
          Channel: `#${targetChannel.name}`,
          "Previous ViewChannel": prevViewChannel === null ? "inherit" : String(prevViewChannel),
        },
      });

      return await ctx.reply({
        embeds: [
          makeEmbed({
            author: { name: "Channel Visibility", iconURL: guild.iconURL?.({ dynamic: true }) || undefined },
            title: "👁️ Channel Hidden",
            description:
              `${targetChannel} is now **hidden** from ${roleLabel}.\n\n` +
              `• Previous permission has been **snapshotted** — unhiding will restore the original state.\n` +
              `\n${scopeNote}`,
            level: "SUCCESS",
            color: COLORS.DARK,
            headerDivider: false,
          }),
        ],
      });
    }

    // ─────────────────────────────────────────────────────────────────────
    // UNHIDE
    // ─────────────────────────────────────────────────────────────────────
    if (action === "unhide") {
      const snapshot = await ChannelPermissionSnapshot.findOne({
        where: {
          guild_id: String(guild.id),
          channel_id: String(targetChannel.id),
          target_id: String(targetRole.id),
          permission_name: "ViewChannel",
        },
      });

      if (!snapshot) {
        // Channel was never hidden via this bot — still restore it to visible
        await targetChannel.permissionOverwrites.edit(targetRole, {
          ViewChannel: null, // inherit from parent
        });
      } else {
        // Restore exact previous permission value from snapshot
        await targetChannel.permissionOverwrites.edit(targetRole, {
          ViewChannel: snapshot.permission_value,
        });
        await snapshot.destroy().catch(() => {});
      }

      await sendModLog({
        guild,
        category: "MODERATION",
        title: "Channel Unhidden",
        description: `${targetChannel} made visible again for ${roleLabel} by <@${user.id}>.`,
        level: "INFO",
        actor: user,
        extraFields: {
          "Target Role": usingVerifiedRole ? verifiedRoleName : "@everyone",
          Channel: `#${targetChannel.name}`,
          "Restored to": snapshot ? (snapshot.permission_value === null ? "inherit" : String(snapshot.permission_value)) : "inherit (no snapshot)",
        },
      });

      return await ctx.reply({
        embeds: [
          makeEmbed({
            author: { name: "Channel Visibility", iconURL: guild.iconURL?.({ dynamic: true }) || undefined },
            title: "👁️ Channel Unhidden",
            description:
              `${targetChannel} is now **visible** again for ${roleLabel}.\n` +
              (snapshot
                ? `• Original permission **restored from snapshot**.\n`
                : `• No snapshot found — permission **reset to inherit** from parent.\n`) +
              `\n${scopeNote}`,
            level: "SUCCESS",
            color: COLORS.DARK,
            headerDivider: false,
          }),
        ],
      });
    }
  },
});
