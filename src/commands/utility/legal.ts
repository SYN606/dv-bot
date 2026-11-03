import { ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } from "discord.js";
import { CONFIG } from "../../config.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed } from "../../core/embeds.js";
import { EMOJIS } from "../../core/emojis.js";

const slashBuilder = new SlashCommandBuilder()
  .setName("legal")
  .setDescription("View Digital Vigital's official Privacy Policy and Terms of Service.")
  .addStringOption((opt) =>
    opt
      .setName("document")
      .setDescription("Choose which legal document to inspect")
      .setRequired(false)
      .addChoices(
        { name: "Privacy Policy", value: "privacy" },
        { name: "Terms of Service", value: "terms" }
      )
  );

export default createCommand({
  name: "legal",
  description: "View Digital Vigital's official Privacy Policy and Terms of Service.",
  category: "Utility",
  aliases: ["privacy", "terms", "tos", "policy"],
  usage: "[privacy | terms]",
  examples: ["/legal", "/legal document:privacy", "/legal document:terms", "dvprivacy", "dvtos"],
  slashBuilder,

  async execute(ctx) {
    const { client, user } = ctx;
    const botName = CONFIG.BOT_NAME || client.user?.username || "Digital Vigital";
    const avatar = client.user?.displayAvatarURL({ dynamic: true, size: 256 }) || null;

    // Detect which document was requested via slash option or prefix alias / argument
    const rawArg = (ctx.options.document || ctx.options._args?.[0] || ctx.commandName || "").toLowerCase();
    const isTerms = rawArg.includes("term") || rawArg === "tos";
    const isPrivacy = rawArg.includes("priv") || rawArg.includes("policy");

    const privacyUrl = `${CONFIG.DASHBOARD_URL}/privacy`;
    const termsUrl = `${CONFIG.DASHBOARD_URL}/terms`;

    let title = `${botName} \u2022 Legal Center`;
    let desc = "";

    if (isPrivacy) {
      title = `${botName} \u2022 Privacy Policy`;
      desc =
        `### ${EMOJIS.get("moderation") || "🛡️"} Data Protection & Privacy Principles\n` +
        `Digital Vigital is built with privacy-first standards in full compliance with the **Discord Developer Policy**.\n\n` +
        `**Key Privacy Commitments:**\n` +
        `\u2022 **Zero Data Selling:** We never sell, monetize, or broker personal information to advertisers or brokers.\n` +
        `\u2022 **Minimal Storage:** Only data strictly necessary for moderation (warnings, timeouts), ticketing, and analytics (aggregate counts) is stored.\n` +
        `\u2022 **No Audio Recording:** The bot does not record, intercept, or store voice channel audio.\n` +
        `\u2022 **Right to Erasure:** Server owners and users can request a complete purge of their records at any time.\n\n` +
        `Read the comprehensive document on our **[Web Dashboard](${privacyUrl})**.`;
    } else if (isTerms) {
      title = `${botName} \u2022 Terms of Service`;
      desc =
        `### ${EMOJIS.get("developer") || "📜"} Terms of Service & Fair Use\n` +
        `By using ${botName} in your Discord server or accessing our web command center, you agree to these Terms.\n\n` +
        `**Core Usage Terms:**\n` +
        `\u2022 **Discord Compliance:** Users must adhere to Discord's Terms of Service and Community Guidelines.\n` +
        `\u2022 **Admin Responsibility:** Server administrators control bot automation, moderation thresholds, and staff access.\n` +
        `\u2022 **Prohibited Abuse:** API flooding, automated raiding, doxxing, or malicious harassment results in permanent blacklist.\n` +
        `\u2022 **Service Availability:** Provided "as is" with continuous security enhancements and 99.9% uptime target.\n\n` +
        `Read the full terms agreement on our **[Web Dashboard](${termsUrl})**.`;
    } else {
      desc =
        `### ${EMOJIS.get("announcement") || "⚖️"} Official Legal & Policy Hub\n` +
        `Welcome to the **${botName}** legal directory. We are committed to transparency, user security, and responsible server automation.\n\n` +
        `**Available Documents:**\n` +
        `\u2022 **[Privacy Policy](${privacyUrl})** — Explains what data we collect (user IDs, warnings, analytics aggregates) and our strict no-selling policy.\n` +
        `\u2022 **[Terms of Service](${termsUrl})** — Outlines acceptable use, administrator responsibilities, and service guidelines.\n\n` +
        `Click the buttons below to read the complete policies in our web portal.`;
    }

    const embed = makeEmbed({
      title,
      description: desc,
      level: "PRIMARY",
      thumbnail: avatar,
      footer: `Digital Vigital \u2022 Last Updated: November 2026`,
    });

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setLabel("Privacy Policy")
        .setStyle(ButtonStyle.Link)
        .setURL(privacyUrl),
      new ButtonBuilder()
        .setLabel("Terms of Service")
        .setStyle(ButtonStyle.Link)
        .setURL(termsUrl),
      new ButtonBuilder()
        .setLabel("Web Dashboard")
        .setStyle(ButtonStyle.Link)
        .setURL(CONFIG.DASHBOARD_URL)
    );

    return await ctx.reply({ embeds: [embed], components: [row] });
  },
});
