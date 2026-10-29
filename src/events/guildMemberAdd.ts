import { Events } from "discord.js";
import {
  VerificationConfig,
  DailyActivitySnapshot,
  TempbanRecord,
  AutoRoleConfig,
  WelcomeConfig,
} from "../db/models/index.js";
import { getTempbanConfig } from "../db/helpers/tempban.js";
import { ensureGuild } from "../db/helpers/common.js";
import { checkMemberSupporter } from "../handlers/supporterHandler.js";
import { buildWelcomePayload, formatWelcomeText } from "../utils/welcomeFormatter.js";

export default {
  name: Events.GuildMemberAdd,
  async execute(client, member) {
    if (!member.guild) return;

    const guildId = String(member.guild.id);
    const today = new Date().toISOString().split("T")[0];

    // 1. Telemetry: Increment daily joins count
    try {
      await ensureGuild(guildId);
      const [snapshot] = await DailyActivitySnapshot.findOrCreate({
        where: { guild_id: guildId, date: today },
        defaults: { guild_id: guildId, date: today, joins_count: 0 },
      });
      await snapshot.increment("joins_count");
    } catch (err) {
      console.error("[MEMBER ADD TELEMETRY ERROR]:", err);
    }

    // 2. Security Check: Re-apply Tempban Isolation Role if active
    try {
      const activeTempban = await TempbanRecord.findOne({
        where: { guild_id: guildId, user_id: String(member.id), active: true },
      });
      if (activeTempban) {
        const tempbanCfg = await getTempbanConfig(guildId);
        if (tempbanCfg && tempbanCfg.role_id) {
          const isolationRole = member.guild.roles.cache.get(String(tempbanCfg.role_id));
          const botMember = member.guild.members.me;
          if (isolationRole && botMember && isolationRole.position < botMember.roles.highest.position) {
            await member.roles.add(isolationRole, "Security enforcement: active tempban isolation re-applied on join").catch(() => {});
            return; // Do not assign unverified or standard roles to actively tempbanned users
          }
        }
      }
    } catch (err) {
      console.error("[TEMPBAN RE-APPLY ERROR]:", err);
    }

    // 3. Automated Verification Gate: Assign Unverified Role
    let hasVerificationGate = false;
    try {
      const config = await VerificationConfig.findByPk(guildId);
      if (config && config.enabled && config.unverified_role_id) {
        hasVerificationGate = true;
        const unverifiedRole = member.guild.roles.cache.get(String(config.unverified_role_id));
        const botMember = member.guild.members.me;

        if (unverifiedRole && botMember && unverifiedRole.position < botMember.roles.highest.position) {
          await member.roles.add(unverifiedRole, "Automatic verification gate: assigned unverified role on join").catch(() => {});
        }
      }
    } catch (err) {
      console.error("[AUTO-UNVERIFIED ROLE ERROR]:", err);
    }

    // 4. Default Legacy Auto-Role on Join (if configured)
    if (!hasVerificationGate) {
      try {
        const autoRole = await AutoRoleConfig.findByPk(guildId);
        if (autoRole && autoRole.role_id) {
          const role = member.guild.roles.cache.get(String(autoRole.role_id));
          const botMember = member.guild.members.me;
          if (role && botMember && role.position < botMember.roles.highest.position) {
            await member.roles.add(role, "Auto-Role: automatically assigned on server join").catch(() => {});
          }
        }
      } catch (err) {
        console.error("[AUTO-ROLE ON JOIN ERROR]:", err);
      }
    }

    // 5. Supporter Rewards Check on Join (Clan Tag & Vanity Status)
    try {
      await checkMemberSupporter(member, true);
    } catch (_) {}

    // 6. Welcome Gatekeeper Engine: Auto-Roles, Public Channel Welcome & DM Onboarding
    try {
      const welcomeCfg = await WelcomeConfig.findByPk(guildId);
      if (!welcomeCfg) return;

      const botMember = member.guild.members.me;

      // 6a. Gatekeeper Auto-Roles
      if (welcomeCfg.autorole_enabled) {
        // Dedicated Bot Auto-Role
        if (member.user.bot && welcomeCfg.bot_role_id) {
          const bRole = member.guild.roles.cache.get(String(welcomeCfg.bot_role_id));
          if (bRole && botMember && bRole.position < botMember.roles.highest.position) {
            await member.roles.add(bRole, "Welcome Gatekeeper: assigned bot auto-role on join").catch(() => {});
          }
        }
        // Human Member Join-Roles (assigned only if verification gate is not holding user)
        else if (!member.user.bot && !hasVerificationGate) {
          let roleIds = [];
          try {
            roleIds = typeof welcomeCfg.join_role_ids === "string"
              ? JSON.parse(welcomeCfg.join_role_ids || "[]")
              : (welcomeCfg.join_role_ids || []);
          } catch (_) {
            roleIds = [];
          }

          if (Array.isArray(roleIds) && roleIds.length > 0) {
            const rolesToAdd = [];
            for (const rId of roleIds) {
              const r = member.guild.roles.cache.get(String(rId));
              if (r && botMember && r.position < botMember.roles.highest.position) {
                rolesToAdd.push(r);
              }
            }
            if (rolesToAdd.length > 0) {
              await member.roles.add(rolesToAdd, "Welcome Gatekeeper: assigned join auto-roles").catch(() => {});
            }
          }
        }
      }

      // 6b. Public Channel Welcome Message Dispatch
      if (welcomeCfg.welcome_enabled && welcomeCfg.welcome_channel_id) {
        let welcomeChannel = member.guild.channels.cache.get(String(welcomeCfg.welcome_channel_id));
        if (!welcomeChannel && member.guild.channels.fetch) {
          welcomeChannel = await member.guild.channels.fetch(String(welcomeCfg.welcome_channel_id)).catch(() => null);
        }

        if (welcomeChannel && welcomeChannel.isTextBased()) {
          const payload = buildWelcomePayload(welcomeCfg, member, "welcome");
          if (payload) {
            const sentMsg = await welcomeChannel.send(payload).catch((err) => {
              console.error("[WELCOME CHANNEL SEND ERROR]:", err);
              return null;
            });

            // Auto-delete timer if configured
            if (sentMsg && welcomeCfg.welcome_delete_seconds > 0) {
              setTimeout(() => {
                sentMsg.delete().catch(() => {});
              }, Number(welcomeCfg.welcome_delete_seconds) * 1000);
            }
          }
        }
      }

      // 6c. Direct Message (DM) Onboarding Dispatch
      if (welcomeCfg.dm_enabled && !member.user.bot) {
        const dmPayload = buildWelcomePayload(welcomeCfg, member, "dm");
        if (dmPayload && (dmPayload.content || dmPayload.embeds?.length > 0)) {
          await member.send(dmPayload).catch(() => {
            // DMs are frequently blocked by user privacy settings; silently catch
          });
        }
      }
    } catch (err) {
      console.error("[WELCOME GATEKEEPER ERROR]:", err);
    }
  },
};
