import {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { VerificationConfig } from "../db/models/index.js";
import { makeEmbed } from "../core/embeds.js";
import { EMOJIS } from "../core/emojis.js";

// In-memory concurrency locks and temporary captcha store
const pendingVerifications = new Set();
const captchaChallenges = new Map(); // key: `${guildId}:${userId}`, value: { code, expires }

function generateCaptchaCode(length = 6) {
  const chars = "23456789abcdefghkmnpqrstuvwxyz";
  let res = "";
  for (let i = 0; i < length; i++) {
    res += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return res;
}

/**
 * Execute role grant & unverified role removal with audit logging
 */
async function executeVerificationGrant(interaction, config) {
  const guildId = interaction.guild.id;
  const userId = interaction.user.id;
  const lockKey = `${guildId}:${userId}`;

  if (pendingVerifications.has(lockKey)) {
    return await interaction.reply({
      embeds: [
        makeEmbed({
          title: "Verification In Progress",
          description: `${EMOJIS.get("warning") || "⚠️"} Your verification is currently being processed. Please wait a moment.`,
          level: "WARNING",
        }),
      ],
      ephemeral: true,
    });
  }

  pendingVerifications.add(lockKey);

  try {
    const verifiedRoleId = String(config.verified_role_id);
    const unverifiedRoleId = config.unverified_role_id ? String(config.unverified_role_id) : null;
    const botMember = interaction.guild.members.me;
    const verifiedRole = interaction.guild.roles.cache.get(verifiedRoleId);

    // 1. Role Existence and Hierarchy Safeguard
    if (!verifiedRole) {
      return await interaction.reply({
        embeds: [
          makeEmbed({
            title: "Verification Role Missing",
            description: `${EMOJIS.get("fail") || "❌"} The configured verified role no longer exists on this server. Please alert an administrator.`,
            level: "ERROR",
          }),
        ],
        ephemeral: true,
      });
    }

    if (botMember && verifiedRole.position >= botMember.roles.highest.position) {
      return await interaction.reply({
        embeds: [
          makeEmbed({
            title: "Role Hierarchy Error",
            description: `${EMOJIS.get("fail") || "❌"} The bot cannot assign the verified role because **@${verifiedRole.name}** is positioned higher than (or equal to) the bot's highest role.\n\n${EMOJIS.get("arrow_point") || "👉"} An administrator must move the bot's role higher in **Server Settings > Roles**.`,
            level: "ERROR",
          }),
        ],
        ephemeral: true,
      });
    }

    // 2. Perform Role Updates
    await interaction.member.roles.add(verifiedRoleId, "Member completed server verification");

    if (unverifiedRoleId && interaction.member.roles.cache.has(unverifiedRoleId)) {
      await interaction.member.roles.remove(unverifiedRoleId, "Removed unverified role upon verification").catch(() => {});
    }

    // 3. Send Rich Audit Log Card
    if (config.log_channel_id) {
      const logChannel = interaction.guild.channels.cache.get(String(config.log_channel_id));
      if (logChannel && logChannel.send) {
        const joinedDuration = interaction.member.joinedTimestamp
          ? `${Math.max(1, Math.round((Date.now() - interaction.member.joinedTimestamp) / 1000))}s`
          : "N/A";
        const accountAgeDays = Math.floor((Date.now() - interaction.user.createdTimestamp) / (1000 * 60 * 60 * 24));
        const isFresh = accountAgeDays < 1;

        const logEmbed = makeEmbed({
          title: "🛡️ Member Verified",
          description:
            `**User:** ${interaction.user} (\`${interaction.user.id}\`)\n` +
            `**Account Age:** <t:${Math.floor(interaction.user.createdTimestamp / 1000)}:R> ${isFresh ? "⚠️ **[FRESH ACCOUNT]**" : ""}\n` +
            `**Verification Time:** ${joinedDuration}\n` +
            `**Roles Added:** <@&${verifiedRoleId}>\n` +
            (unverifiedRoleId ? `**Roles Removed:** <@&${unverifiedRoleId}>\n` : ""),
          level: isFresh ? "WARNING" : "SUCCESS",
          footer: `Guild: ${interaction.guild.name}`,
        });

        if (interaction.user.displayAvatarURL) {
          logEmbed.data.thumbnail = { url: interaction.user.displayAvatarURL() };
        }

        await logChannel.send({ embeds: [logEmbed] }).catch(() => {});
      }
    }

    // 4. Success Response
    return await interaction.reply({
      embeds: [
        makeEmbed({
          title: "Verification Successful",
          description: `${EMOJIS.get("success") || "✅"} Welcome to **${interaction.guild.name}**! You have been granted full member access.`,
          level: "SUCCESS",
        }),
      ],
      ephemeral: true,
    });
  } catch (err) {
    console.error("[VERIFICATION GRANT ERROR]:", err);
    return await interaction.reply({
      embeds: [
        makeEmbed({
          title: "Verification Error",
          description: `${EMOJIS.get("fail") || "❌"} Failed to assign the verified role. Please ensure the bot has **Manage Roles** permission and appropriate role hierarchy.`,
          level: "ERROR",
        }),
      ],
      ephemeral: true,
    });
  } finally {
    pendingVerifications.delete(lockKey);
  }
}

export function registerVerificationComponent(client) {
  // 1. Verification Button Handler
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

    if (!config || !config.enabled || !config.verified_role_id) {
      return await interaction.reply({
        embeds: [
          makeEmbed({
            title: "Verification Unavailable",
            description: `${EMOJIS.get("warning") || "⚠️"} Server verification is not currently active or configured. An administrator can enable it in the dashboard.`,
            level: "WARNING",
          }),
        ],
        ephemeral: true,
      });
    }

    const verifiedRoleId = String(config.verified_role_id);
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

    // Security check: Minimum account age quarantine
    if (config.min_account_age_hours && config.min_account_age_hours > 0) {
      const ageHours = (Date.now() - interaction.user.createdTimestamp) / (1000 * 60 * 60);
      if (ageHours < config.min_account_age_hours) {
        const remainingHours = Math.ceil(config.min_account_age_hours - ageHours);
        return await interaction.reply({
          embeds: [
            makeEmbed({
              title: "Account Too New",
              description: `${EMOJIS.get("warning") || "⚠️"} For server security, accounts must be at least **${config.min_account_age_hours} hours** old to verify.\n\n${EMOJIS.get("clock") || "⏳"} Please try again in **${remainingHours} hours**.`,
              level: "WARNING",
            }),
          ],
          ephemeral: true,
        });
      }
    }

    // Challenge Mode: Interactive Captcha Modal
    if (config.mode === "captcha") {
      const code = generateCaptchaCode(6);
      const challengeKey = `${guildId}:${interaction.user.id}`;
      captchaChallenges.set(challengeKey, {
        code,
        expires: Date.now() + 180000, // 3 minute expiry
      });

      const modal = new ModalBuilder()
        .setCustomId("verify_captcha_modal")
        .setTitle("Security Check: Enter Code");

      const codeDisplayInput = new TextInputBuilder()
        .setCustomId("captcha_display")
        .setLabel(`Type this exact code: ${code}`)
        .setValue(code)
        .setStyle(TextInputStyle.Short)
        .setRequired(false);

      const userInput = new TextInputBuilder()
        .setCustomId("captcha_input")
        .setLabel("Enter the 6-character code above")
        .setPlaceholder(`e.g. ${code}`)
        .setMinLength(5)
        .setMaxLength(8)
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      modal.addComponents(
        new ActionRowBuilder().addComponents(codeDisplayInput),
        new ActionRowBuilder().addComponents(userInput)
      );

      return await interaction.showModal(modal);
    }

    // Instant Button Mode
    await executeVerificationGrant(interaction, config);
  });

  // 2. Captcha Modal Submission Handler
  client.components.set("verify_captcha_modal", async (interaction) => {
    const guildId = interaction.guild?.id;
    if (!guildId || !interaction.member) return;

    const challengeKey = `${guildId}:${interaction.user.id}`;
    const challenge = captchaChallenges.get(challengeKey);
    captchaChallenges.delete(challengeKey);

    const userInput = interaction.fields.getTextInputValue("captcha_input")?.trim().toLowerCase();

    if (!challenge || Date.now() > challenge.expires) {
      return await interaction.reply({
        embeds: [
          makeEmbed({
            title: "Verification Expired",
            description: `${EMOJIS.get("fail") || "❌"} Verification timed out. Please click the button to try again.`,
            level: "ERROR",
          }),
        ],
        ephemeral: true,
      });
    }

    if (userInput !== challenge.code.toLowerCase()) {
      return await interaction.reply({
        embeds: [
          makeEmbed({
            title: "Incorrect Code",
            description: `${EMOJIS.get("fail") || "❌"} The code you entered (\`${userInput}\`) did not match. Please click the verify button to try again with a new code.`,
            level: "ERROR",
          }),
        ],
        ephemeral: true,
      });
    }

    const config = await VerificationConfig.findByPk(guildId);
    if (!config || !config.enabled || !config.verified_role_id) {
      return await interaction.reply({
        embeds: [
          makeEmbed({
            title: "Verification Unavailable",
            description: `${EMOJIS.get("warning") || "⚠️"} Verification is not configured on this server.`,
            level: "WARNING",
          }),
        ],
        ephemeral: true,
      });
    }

    await executeVerificationGrant(interaction, config);
  });
}
