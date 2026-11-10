import {
  PermissionFlagsBits,
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed } from "../../core/embeds.js";
import { EMOJIS } from "../../core/emojis.js";
import {
  getAntinukeSettings,
  updateAntinukeSettings,
  getAntinukeTrustees,
  addAntinukeTrustee,
  removeAntinukeTrustee,
  getAntinukeIncidents,
  getAntinukeIncidentById,
  resolveAntinukeIncident,
} from "../../db/helpers/antinuke.js";
import { setModuleEnabled } from "../../db/helpers/moduleStatus.js";
import {
  ANTINUKE_SERVICE,
  formatThreatName,
  formatPunishmentApplied,
} from "../../services/antinukeService.js";
import { TOPOLOGY_MIRROR } from "../../services/topologyMirror.js";
import { CONFIG } from "../../config.js";

const slashBuilder = new SlashCommandBuilder()
  .setName("antinuke")
  .setDescription("Configure and manage server anti-nuke protection")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .setDMPermission(false)
  // Subcommand: status
  .addSubcommand((sub) =>
    sub.setName("status").setDescription("View server protection status, safety limits, and backup status")
  )
  // Subcommand: enable
  .addSubcommand((sub) =>
    sub.setName("enable").setDescription("Turn on server anti-nuke protection")
  )
  // Subcommand: disable
  .addSubcommand((sub) =>
    sub.setName("disable").setDescription("Pause server anti-nuke protection")
  )
  // Subcommand: lockdown
  .addSubcommand((sub) =>
    sub
      .setName("lockdown")
      .setDescription("Lock or unlock public channels during an emergency or raid")
      .addStringOption((opt) =>
        opt
          .setName("action")
          .setDescription("Lockdown action")
          .setRequired(true)
          .addChoices(
            { name: "Lock Down Server (Pause Public Chat)", value: "on" },
            { name: "Lift Lockdown (Restore Normal Chat)", value: "off" }
          )
      )
  )
  // Subcommand Group: trust
  .addSubcommandGroup((grp) =>
    grp
      .setName("trust")
      .setDescription("Manage trusted staff members and bypass permissions")
      .addSubcommand((sub) =>
        sub
          .setName("add")
          .setDescription("Add a trusted user or role to the whitelist")
          .addMentionableOption((opt) =>
            opt.setName("target").setDescription("The user or role to trust").setRequired(true)
          )
          .addIntegerOption((opt) =>
            opt
              .setName("tier")
              .setDescription("Trust Tier")
              .setRequired(true)
              .addChoices(
                { name: "Tier 1: Full Bypass (Co-Owner)", value: 1 },
                { name: "Tier 2: Senior Admin (Channels & Roles)", value: 2 },
                { name: "Tier 3: Moderator (Basic Bypasses)", value: 3 }
              )
          )
      )
      .addSubcommand((sub) =>
        sub
          .setName("remove")
          .setDescription("Remove a user or role from the trust whitelist")
          .addMentionableOption((opt) =>
            opt.setName("target").setDescription("The user or role to remove").setRequired(true)
          )
      )
      .addSubcommand((sub) =>
        sub
          .setName("bot")
          .setDescription("Whitelist or remove a bot (e.g. Join-to-Create, Temp Voice) for channel deletion bypass")
          .addUserOption((opt) =>
            opt.setName("target").setDescription("The bot application to whitelist").setRequired(true)
          )
          .addStringOption((opt) =>
            opt
              .setName("action")
              .setDescription("Whitelist action")
              .setRequired(false)
              .addChoices(
                { name: "Whitelist Bot (Channel Bypass)", value: "add" },
                { name: "Remove Bot from Whitelist", value: "remove" }
              )
          )
      )
      .addSubcommand((sub) =>
        sub.setName("list").setDescription("Display all currently trusted members and roles")
      )
  )
  // Subcommand: rollback
  .addSubcommand((sub) =>
    sub
      .setName("rollback")
      .setDescription("Restore deleted channels or roles from an incident snapshot")
      .addStringOption((opt) =>
        opt.setName("incident_id").setDescription("The Incident ID from /antinuke status or incident logs").setRequired(true)
      )
  );

export default createCommand({
  name: "antinuke",
  description: "Server Protection & Anti-Nuke Defense",
  category: "Admin",
  module: "antinuke",
  usage: "<status | enable | disable | lockdown | trust | rollback>",
  examples: [
    "/antinuke status",
    "/antinuke enable",
    "/antinuke lockdown action:Engage",
    "/antinuke trust add target:@Admin tier:Tier 2",
    "/antinuke rollback incident_id:abc-123",
  ],
  modOnly: true,
  slashOnly: true,
  slashBuilder,

  async execute(ctx) {
    const { guild, member } = ctx;
    if (!guild || !member) return;

    // Strict Server Owner, Superuser, or Whitelisted Trustee check
    const isOwner = member.id === guild.ownerId || (Array.isArray(CONFIG.SUPERUSERS) && CONFIG.SUPERUSERS.includes(member.id));
    const trustees = await getAntinukeTrustees(guild.id);
    const isTrustee = trustees.some(
      (t: any) =>
        ((t.target_type === "user" || t.target_type === "bot") && t.target_id === member.id) ||
        (t.target_type === "role" && member.roles.cache.has(t.target_id))
    );

    const canManageAntinuke = isOwner || isTrustee;
    if (!canManageAntinuke) {
      await ctx.defer({ ephemeral: true });
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Permission Denied",
            description: `${EMOJIS.get("fail") || "❌"} Anti-Nuke defense and commands can only be accessed or modified by the **Server Owner**, bot superusers, or whitelisted **Anti-Nuke Trustees**. Standard administrator and dashboard staff roles do not have permission.`,
            level: "ERROR",
          }),
        ],
        ephemeral: true,
      });
    }

    const subGroup = ctx.interaction?.options?.getSubcommandGroup?.(false) || null;
    const subCommand = ctx.subcommand || ctx.interaction?.options?.getSubcommand?.(false) || ctx.options?.subcommand;

    await ctx.defer({ ephemeral: true });

    // ─────────────────────────────────────────────────────────────────────────
    // 1. Status Command
    // ─────────────────────────────────────────────────────────────────────────
    if (subCommand === "status") {
      const [settings, trustees, incidents] = await Promise.all([
        getAntinukeSettings(guild.id),
        getAntinukeTrustees(guild.id),
        getAntinukeIncidents(guild.id, 5),
      ]);

      const topo = TOPOLOGY_MIRROR.getTopology(guild.id);
      const isEnabled = Boolean(settings.enabled);
      const isLockdown = Boolean(settings.emergency_lockdown_active);

      const statusBadge = isLockdown
        ? `${EMOJIS.get("warning") || "⚠️"} **Emergency Lockdown Active**`
        : isEnabled
        ? `${EMOJIS.get("success") || "✅"} **Protection Active & Monitoring**`
        : `${EMOJIS.get("fail") || "❌"} **Protection Currently Paused**`;

      const embed = makeEmbed({
        title: `${EMOJIS.get("moderation") || "🛡️"} Server Protection & Defense Status`,
        description: `${statusBadge}\nReal-time monitoring protects channels, roles, and member permissions from accidental mass deletions or attacks.`,
        fields: [
          {
            name: `${EMOJIS.get("okay") || "⚙️"} Protection Settings`,
            value: [
              `• **Status**: \`${isEnabled ? "Active & Monitoring" : "Paused"}\``,
              `• **Action on Violation**: \`${settings.punishment_type === "quarantine" ? "Quarantine (Remove Admin)" : settings.punishment_type === "ban" ? "Ban User" : "Kick User"}\``,
              `• **Safety Window**: \`${settings.window_seconds}s\``,
              `• **Auto-Restoration**: \`${settings.auto_recreate_assets ? "Enabled (Auto-Restore)" : "Disabled"}\``,
            ].join("\n"),
            inline: true,
          },
          {
            name: `${EMOJIS.get("warning") || "⚡"} Safety Limit Thresholds`,
            value: [
              `• **Channel Deletions**: \`>${settings.channel_delete_threshold}\``,
              `• **Role Deletions**: \`>${settings.role_delete_threshold}\``,
              `• **Member Bans**: \`>${settings.member_ban_threshold}\``,
              `• **Member Kicks**: \`>${settings.member_kick_threshold}\``,
              `• **Webhooks**: \`>${settings.webhook_create_threshold}\``,
            ].join("\n"),
            inline: true,
          },
          {
            name: `${EMOJIS.get("moderation") || "🔒"} Security Shields`,
            value: [
              `• **Unauthorized Bots**: \`${settings.strict_anti_bot ? "Auto-Ban" : "Off"}\``,
              `• **Dangerous Perm Revert**: \`${settings.strict_dangerous_perms ? "Instant Revert" : "Off"}\``,
              `• **Server Identity**: \`${settings.strict_vanity_protect ? "Protected" : "Off"}\``,
              `• **Quarantine Role**: ${settings.quarantine_role_id ? `<@&${settings.quarantine_role_id}>` : "`None (Roles Revoked)`"}`,
            ].join("\n"),
            inline: false,
          },
          {
            name: `${EMOJIS.get("admin") || "👥"} Trusted Staff (${trustees.length})`,
            value:
              trustees.length > 0
                ? trustees
                    .slice(0, 8)
                    .map((t) =>
                      t.target_type === "role"
                        ? `• <@&${t.target_id}> (Tier ${t.trust_tier})`
                        : `• <@${t.target_id}> (Tier ${t.trust_tier})`
                    )
                    .join("\n") + (trustees.length > 8 ? `\n*...and ${trustees.length - 8} more.*` : "")
                : "*Server Owner only. No custom trustees registered.*",
            inline: true,
          },
          {
            name: `${EMOJIS.get("okay") || "♻️"} Live Backup Status`,
            value: [
              `• **Monitored Channels**: \`${topo?.channels.size ?? guild.channels.cache.size}\``,
              `• **Monitored Roles**: \`${topo?.roles.size ?? guild.roles.cache.size}\``,
              `• **Instant Recovery**: \`Ready\``,
            ].join("\n"),
            inline: true,
          },
        ],
        level: isLockdown ? "ERROR" : isEnabled ? "SUCCESS" : "PRIMARY",
      });

      if (incidents.length > 0) {
        embed.addFields({
          name: `${EMOJIS.get("warning") || "🚨"} Recent Security Activity`,
          value: incidents
            .map((inc) => {
              const friendlyType = formatThreatName(inc.threat_type);
              const friendlyPunishment = formatPunishmentApplied(inc.punishment_applied, inc.threat_type);
              const status = inc.resolved ? "Resolved" : "Open";
              return `• **${friendlyType}** by <@${inc.executor_id}> — ${friendlyPunishment} (${status})`;
            })
            .join("\n"),
        });
      }

      const dashboardUrl = `${CONFIG.DASHBOARD_URL}/dashboard/${guild.id}/antinuke`;
      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setLabel("Open Security Dashboard")
          .setStyle(ButtonStyle.Link)
          .setURL(dashboardUrl)
          .setEmoji("🌐")
      );

      return await ctx.reply({ embeds: [embed], components: [row] });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 2. Enable / Disable Command
    // ─────────────────────────────────────────────────────────────────────────
    if (subCommand === "enable" || subCommand === "disable") {
      const enabled = subCommand === "enable";
      await updateAntinukeSettings(guild.id, { enabled: enabled ? 1 : 0 });
      await setModuleEnabled(guild.id, "antinuke", enabled);

      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: enabled
              ? `${EMOJIS.get("success") || "🛡️"} Server Protection Activated`
              : `${EMOJIS.get("warning") || "⚠️"} Server Protection Paused`,
            description: enabled
              ? `Server protection is now **ACTIVE** across **${guild.name}**.\n${EMOJIS.get("arrow_point") || "👉"} All rapid channel deletions, role modifications, member bans, and unauthorized bot invites are monitored and protected.`
              : `${EMOJIS.get("fail") || "❌"} Server protection has been **PAUSED**. Administrative actions are not currently monitored against safety limits.`,
            level: enabled ? "SUCCESS" : "WARNING",
          }),
        ],
      });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 3. Emergency Lockdown Command
    // ─────────────────────────────────────────────────────────────────────────
    if (subCommand === "lockdown") {
      const action = ctx.interaction?.options?.getString?.("action") || ctx.options?.action;
      if (action === "on") {
        const success = await ANTINUKE_SERVICE.engageEmergencyLockdown(
          guild,
          `Triggered by Server Owner @${member.user.tag}`
        );

        return await ctx.reply({
          embeds: [
            makeEmbed({
              title: success
                ? `${EMOJIS.get("warning") || "🚨"} Server-Wide Emergency Lockdown Active`
                : `${EMOJIS.get("fail") || "❌"} Lockdown Failed`,
              description: success
                ? `Public messaging, thread creation, and voice connect permissions have been **paused** for \`@everyone\`.\n${EMOJIS.get("arrow_point") || "👉"} Regular members cannot send messages until you lift the lockdown.`
                : `${EMOJIS.get("fail") || "❌"} Could not modify permissions for \`@everyone\`. Please check the bot's role hierarchy.`,
              level: success ? "ERROR" : "WARNING",
            }),
          ],
        });
      } else {
        const success = await ANTINUKE_SERVICE.liftEmergencyLockdown(
          guild,
          `Lifted by Server Owner @${member.user.tag}`
        );

        return await ctx.reply({
          embeds: [
            makeEmbed({
              title: success
                ? `${EMOJIS.get("success") || "🟢"} Emergency Lockdown Lifted`
                : `${EMOJIS.get("fail") || "❌"} Unlock Failed`,
              description: success
                ? `${EMOJIS.get("okay") || "✅"} Standard messaging and voice permissions have been restored for \`@everyone\`.`
                : `${EMOJIS.get("fail") || "❌"} Failed to restore permissions for \`@everyone\`.`,
              level: success ? "SUCCESS" : "WARNING",
            }),
          ],
        });
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 4. Trust Management
    // ─────────────────────────────────────────────────────────────────────────
    if (subGroup === "trust") {
      if (subCommand === "bot") {
        const botUser = ctx.interaction?.options?.getUser?.("target") || (ctx.options?.target ? (await ctx.client.users.fetch(ctx.options.target).catch(() => null)) : null);
        const action = ctx.interaction?.options?.getString?.("action") || ctx.options?.action || "add";
        if (!botUser) return;

        if (action === "remove") {
          await removeAntinukeTrustee(guild.id, botUser.id);
          return await ctx.reply({
            embeds: [
              makeEmbed({
                title: `${EMOJIS.get("okay") || "ℹ️"} Bot Whitelist Removed`,
                description: `Removed <@${botUser.id}> from the trusted list. Standard channel deletion and safety limits now apply to this bot.`,
                level: "INFO",
              }),
            ],
          });
        }

        await addAntinukeTrustee({
          guild_id: guild.id,
          target_id: botUser.id,
          target_type: "bot",
          trust_tier: 2,
          bypass_channels: true,
          bypass_roles: false,
          bypass_members: false,
          bypass_bots: false,
          bypass_webhooks: false,
        });

        return await ctx.reply({
          embeds: [
            makeEmbed({
              title: `${EMOJIS.get("success") || "🤖"} Bot Whitelisted (Channel Bypass)`,
              description: `Successfully whitelisted <@${botUser.id}> as a trusted integration.\n\n${EMOJIS.get("arrow_point") || "👉"} **Channel Bypass Granted**: This bot (e.g. Join-to-Create, Temp Voice) can now create and delete temporary voice channels dynamically without triggering Anti-Nuke security limits or punishments.`,
              level: "SUCCESS",
            }),
          ],
        });
      }

      if (subCommand === "add") {
        const mentionable = ctx.interaction?.options?.getMentionable?.("target") || (ctx.options?.target ? (guild.roles.cache.get(ctx.options.target) || await guild.members.fetch(ctx.options.target).catch(() => null)) : null);
        const tier = ctx.interaction?.options?.getInteger?.("tier") ?? (ctx.options?.tier !== undefined ? Number(ctx.options.tier) : 2);
        if (!mentionable) return;

        const isRole = Boolean((mentionable as any).color !== undefined);
        const isBot = Boolean((mentionable as any).user?.bot || (mentionable as any).bot);
        const targetType = isBot ? "bot" : (isRole ? "role" : "user");

        await addAntinukeTrustee({
          guild_id: guild.id,
          target_id: mentionable.id,
          target_type: targetType,
          trust_tier: tier,
          bypass_channels: true,
          bypass_roles: !isBot,
          bypass_members: !isBot && tier <= 2,
          bypass_bots: !isBot && tier === 1,
          bypass_webhooks: !isBot && tier === 1,
        });

        return await ctx.reply({
          embeds: [
            makeEmbed({
              title: `${EMOJIS.get("success") || "✅"} Whitelist Updated`,
              description: `Successfully added ${isRole ? `<@&${mentionable.id}>` : `<@${mentionable.id}>`} to the trusted list as **${isBot ? "Trusted Bot" : `Tier ${tier}`}** (${
                isBot ? "Channel Bypass" : tier === 1 ? "Full Bypass" : tier === 2 ? "Senior Staff" : "Moderator"
              }).\n${EMOJIS.get("arrow_point") || "👉"} They are exempt from standard rate limits when making server changes.`,
              level: "SUCCESS",
            }),
          ],
        });
      }

      if (subCommand === "remove") {
        const mentionable = ctx.interaction?.options?.getMentionable?.("target") || (ctx.options?.target ? (guild.roles.cache.get(ctx.options.target) || await guild.members.fetch(ctx.options.target).catch(() => null)) : null);
        if (!mentionable) return;

        await removeAntinukeTrustee(guild.id, mentionable.id);

        return await ctx.reply({
          embeds: [
            makeEmbed({
              title: `${EMOJIS.get("okay") || "ℹ️"} Whitelist Entry Removed`,
              description: `Removed <@${mentionable.id}> from the trusted list. Standard protection limits now apply.`,
              level: "INFO",
            }),
          ],
        });
      }

      if (subCommand === "list") {
        const trustees = await getAntinukeTrustees(guild.id);
        const botTrustees = trustees.filter((t: any) => t.target_type === "bot");
        const staffTrustees = trustees.filter((t: any) => t.target_type !== "bot");

        const staffStr = staffTrustees.length > 0
          ? staffTrustees.map((t: any) => {
              const targetStr = t.target_type === "role" ? `<@&${t.target_id}>` : `<@${t.target_id}>`;
              const tierStr = t.trust_tier === 1 ? "Tier 1 (Full Bypass)" : t.trust_tier === 2 ? "Tier 2 (Senior Staff)" : "Tier 3 (Moderator)";
              return `• ${targetStr} — **${tierStr}**`;
            }).join("\n")
          : "*No staff members or roles registered.*";

        const botStr = botTrustees.length > 0
          ? botTrustees.map((t: any) => `• <@${t.target_id}> — **Channel Bypass (Join-to-Create / Temp Voice)**`).join("\n")
          : "*No bots whitelisted yet.*";

        return await ctx.reply({
          embeds: [
            makeEmbed({
              title: `${EMOJIS.get("moderation") || "🛡️"} Trusted Whitelist (${trustees.length})`,
              fields: [
                { name: "🛡️ Trusted Staff & Roles", value: staffStr, inline: false },
                { name: "🤖 Whitelisted Bots (Join-to-Create / Temp Channels)", value: botStr, inline: false },
              ],
              level: "PRIMARY",
            }),
          ],
        });
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 5. Rollback Command
    // ─────────────────────────────────────────────────────────────────────────
    if (subCommand === "rollback") {
      const incidentId = ctx.interaction?.options?.getString?.("incident_id") || ctx.options?.incident_id;
      const incident = await getAntinukeIncidentById(guild.id, incidentId);

      if (!incident) {
        return await ctx.reply({
          embeds: [
            makeEmbed({
              title: "Incident Not Found",
              description: `${EMOJIS.get("fail") || "❌"} Could not find an incident matching ID \`${incidentId}\`.`,
              level: "ERROR",
            }),
          ],
        });
      }

      if (!incident.snapshot_data) {
        return await ctx.reply({
          embeds: [
            makeEmbed({
              title: "No Snapshot Available",
              description: `${EMOJIS.get("fail") || "❌"} This incident does not contain a recoverable channel or role snapshot.`,
              level: "WARNING",
            }),
          ],
        });
      }

      try {
        const snapshot = typeof incident.snapshot_data === "string" ? JSON.parse(incident.snapshot_data) : incident.snapshot_data;
        let restoredName = "";

        if (snapshot.type !== undefined && snapshot.permissionOverwrites !== undefined) {
          const restored = await TOPOLOGY_MIRROR.restoreChannel(guild, snapshot);
          if (restored) restoredName = `#${restored.name}`;
        } else if (snapshot.permissions !== undefined && snapshot.color !== undefined) {
          const restored = await TOPOLOGY_MIRROR.restoreRole(guild, snapshot);
          if (restored) restoredName = `@${restored.name}`;
        }

        await resolveAntinukeIncident(guild.id, incidentId);

        return await ctx.reply({
          embeds: [
            makeEmbed({
              title: `${EMOJIS.get("success") || "♻️"} Resource Restored Successfully`,
              description: `${EMOJIS.get("okay") || "✅"} Successfully recovered **${restoredName || "Resource"}** from the backup snapshot.\n${EMOJIS.get("arrow_point") || "👉"} Incident record \`#${incidentId.slice(0, 8)}\` is now marked as **Resolved**.`,
              level: "SUCCESS",
            }),
          ],
        });
      } catch (err: any) {
        return await ctx.reply({
          embeds: [
            makeEmbed({
              title: "Rollback Failed",
              description: `Error executing snapshot restore: ${err.message}`,
              level: "ERROR",
            }),
          ],
        });
      }
    }
  },
});
