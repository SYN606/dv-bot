import { VerificationConfig } from "../db/models/index.js";
import { makeEmbed } from "../core/embeds.js";
import { EMOJIS } from "../core/emojis.js";

export function registerVerificationComponent(client) {
  client.components.set("verify_member_btn", async (interaction) => {
    if (!interaction.guild || !interaction.member) {
      return await interaction.reply({
        embeds: [
          makeEmbed({
            title: "Verification Failed",
            description: "Verification can only be performed inside a server.",
            level: "ERROR",
          }),
        ],
        ephemeral: true,
      });
    }

    const guildId = interaction.guild.id;
    const config = await VerificationConfig.findByPk(guildId);

    if (!config || !config.verified_role_id) {
      return await interaction.reply({
        embeds: [
          makeEmbed({
            title: "Not Configured",
            description: `${EMOJIS.get("warning") || "⚠️"} Verification is not configured on this server yet. An administrator must set the verified role in the dashboard.`,
            level: "WARNING",
          }),
        ],
        ephemeral: true,
      });
    }

    const verifiedRoleId = String(config.verified_role_id);
    const unverifiedRoleId = config.unverified_role_id ? String(config.unverified_role_id) : null;

    if (interaction.member.roles.cache.has(verifiedRoleId)) {
      return await interaction.reply({
        embeds: [
          makeEmbed({
            title: "Already Verified",
            description: `${EMOJIS.get("success") || "✅"} You are already verified in **${interaction.guild.name}**!`,
            level: "INFO",
          }),
        ],
        ephemeral: true,
      });
    }

    try {
      await interaction.member.roles.add(verifiedRoleId);

      if (unverifiedRoleId && interaction.member.roles.cache.has(unverifiedRoleId)) {
        await interaction.member.roles.remove(unverifiedRoleId).catch(() => {});
      }

      // Log verification if log channel configured
      if (config.log_channel_id) {
        const logChannel = interaction.guild.channels.cache.get(String(config.log_channel_id));
        if (logChannel && logChannel.send) {
          await logChannel.send({
            embeds: [
              makeEmbed({
                title: "Member Verified",
                description: `${EMOJIS.get("success") || "✅"} ${interaction.user} (\`${interaction.user.id}\`) completed verification.`,
                level: "SUCCESS",
                footer: `Guild: ${interaction.guild.name}`,
              }),
            ],
          }).catch(() => {});
        }
      }

      return await interaction.reply({
        embeds: [
          makeEmbed({
            title: "Verification Successful",
            description: `${EMOJIS.get("success") || "✅"} Welcome to **${interaction.guild.name}**! You now have full member access.`,
            level: "SUCCESS",
          }),
        ],
        ephemeral: true,
      });
    } catch (err) {
      console.error("[VERIFICATION COMPONENT ERROR]:", err);
      return await interaction.reply({
        embeds: [
          makeEmbed({
            title: "Verification Error",
            description: `${EMOJIS.get("fail") || "❌"} Failed to assign the verified role. Please ask an admin to check bot role hierarchy permissions.`,
            level: "ERROR",
          }),
        ],
        ephemeral: true,
      });
    }
  });
}
