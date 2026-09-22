import { getExpiredTempbans, getTempbanConfig } from "../db/helpers/tempban.js";
import { VerificationConfig } from "../db/models/index.js";
import { sendModLog } from "../utils/modLog.js";

export class TempbanWorker {
  constructor(client, intervalMs = 30000) {
    this.client = client;
    this.intervalMs = intervalMs;
    this.timer = null;
  }

  start() {
    if (!this.timer) {
      this.timer = setInterval(() => this.check(), this.intervalMs);
    }
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async check() {
    try {
      const expired = await getExpiredTempbans();
      if (!expired || expired.length === 0) return;

      for (const record of expired) {
        const guild = this.client.guilds.cache.get(String(record.guild_id));
        if (!guild) {
          record.active = false;
          await record.save();
          continue;
        }

        const config = await getTempbanConfig(record.guild_id);

        if (config && config.role_id) {
          // Role-based tempban
          const member = await guild.members.fetch(String(record.user_id)).catch(() => null);
          if (member) {
            await member.roles.remove(String(config.role_id)).catch(() => {});

            // Graceful restoration of verified role if verification is configured
            try {
              const verifConfig = await VerificationConfig.findByPk(guild.id);
              if (verifConfig && verifConfig.enabled && verifConfig.verified_role_id) {
                const verifiedRole = guild.roles.cache.get(String(verifConfig.verified_role_id));
                const botMember = guild.members.me;
                if (
                  verifiedRole &&
                  botMember &&
                  verifiedRole.position < botMember.roles.highest.position &&
                  !member.roles.cache.has(verifiedRole.id)
                ) {
                  await member.roles.add(verifiedRole, "Restoring verified status (Tempban expired)").catch(() => {});
                }
              }
            } catch (err) {
              console.warn("[TEMPBAN WORKER VERIFICATION RESTORE ERROR]:", err?.message);
            }
          }
        } else {
          // Native guild unban
          await guild.bans.remove(String(record.user_id), "Temporary ban expired").catch(() => {});
        }

        record.active = false;
        await record.save();

        await sendModLog({
          guild,
          category: "MODERATION",
          title: "Tempban Expired",
          description: `Temporary ban expired for <@${record.user_id}>.`,
          level: "INFO",
        });
      }
    } catch (err) {
      console.error("[TEMPBAN WORKER ERROR]:", err);
    }
  }
}
