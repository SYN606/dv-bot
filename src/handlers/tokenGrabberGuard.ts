import { type Message, PermissionFlagsBits } from "discord.js";
import { makeEmbed, COLORS } from "../core/embeds.js";
import { logger } from "../utils/logger.js";

// Regex matching Discord user tokens, bot tokens, and MFA tokens
const DISCORD_TOKEN_REGEX = /(?:mfa\.[\w-]{84}|[\w-]{24,26}\.[\w-]{6}\.[\w-]{27,38})/g;

// List of known token-grabbing, phishing, and IP logger domain patterns
const SUSPICIOUS_DOMAINS = [
  // Typosquatted Discord & Nitro phishing domains
  /d[li1]sc[o0]rc?[l1]\.(?:com|gift|link|org|ru|info|xyz|top|app|space|me|site)/i,
  /disc[o0]rd(?:-nitro|-gift|nitro|gift|app|-free|free)\.(?:link|click|site|top|xyz|info|ru|me|app)/i,
  /steam(?:-discord|discord|-nitro|nitro|-community)\.(?:link|click|ru|top|xyz)/i,
  /dlscord\.(?:com|gift|net|org)/i,
  /discorcl\.(?:com|net|org)/i,
  /discordapp\.(?:click|biz|info|top)/i,
  /discord\.gifts/i,
  // Known IP loggers & grabber redirectors
  /grabify\.link/i,
  /iplogger\.(?:org|ru|com)/i,
  /2no\.co/i,
  /yip\.su/i,
  /canarytokens\.com/i,
  /blasze\.tk/i,
];

// Suspicious file extensions commonly used in token grabbers
const DANGEROUS_EXTENSIONS = /\.(?:scr|exe|pif|bat|cmd|vbs|hta|ps1)$/i;

/**
 * Anti-Token-Grabbing & Anti-Phishing Guard
 * Scans messages for exposed Discord tokens, token-logging URLs, and phishing payloads.
 * Automatically deletes the message and alerts the user to prevent account compromise.
 *
 * @returns {Promise<boolean>} True if a token or grabber was intercepted and deleted.
 */
export async function handleTokenGrabberGuard(message: Message): Promise<boolean> {
  if (!message.guild || message.author.bot) return false;

  const content = message.content || "";
  let threatDetected: string | null = null;
  let threatDetails: string | null = null;

  // 1. Scan for raw exposed Discord tokens
  if (DISCORD_TOKEN_REGEX.test(content)) {
    threatDetected = "EXPOSED_DISCORD_TOKEN";
    threatDetails = "An exposed Discord authentication token was detected and intercepted.";
  }

  // 2. Scan for token-grabber & phishing domains
  if (!threatDetected) {
    for (const pattern of SUSPICIOUS_DOMAINS) {
      if (pattern.test(content)) {
        threatDetected = "TOKEN_GRABBER_PHISHING_LINK";
        threatDetails = "A known token-grabber or malicious phishing link was detected.";
        break;
      }
    }
  }

  // 3. Scan attachments for dangerous executable payloads
  if (!threatDetected && message.attachments && message.attachments.size > 0) {
    for (const attachment of message.attachments.values()) {
      if (DANGEROUS_EXTENSIONS.test(attachment.name || "")) {
        threatDetected = "MALICIOUS_EXECUTABLE_PAYLOAD";
        threatDetails = `Attachment '${attachment.name}' contains a dangerous executable extension commonly used by token grabbers.`;
        break;
      }
    }
  }

  if (!threatDetected) {
    return false;
  }

  // Threat detected! Immediately delete the message to protect the user/guild
  try {
    if (message.deletable) {
      await message.delete().catch(() => null);
    }
  } catch (err: any) {
    logger.warn(`[TOKEN GUARD] Could not delete message: ${err.message}`);
  }

  // Send security alert directly to the sender via DM (or in-channel if DMs are disabled)
  const alertEmbed = makeEmbed({
    title: "🛡️ Account Security Alert: Potential Token Compromise",
    description: `Your message in **${message.guild.name}** was automatically removed by **Digital Vigital Anti-Token Guard** to protect your account.`,
    color: COLORS.ERROR,
    fields: [
      { name: "Threat Intercepted", value: `\`${threatDetected}\``, inline: true },
      { name: "Details", value: threatDetails || "Sensitive credential intercepted.", inline: false },
      {
        name: "Recommended Immediate Actions",
        value:
          threatDetected === "EXPOSED_DISCORD_TOKEN"
            ? "1. Immediately change your Discord password (this invalidates your leaked token).\n2. Enable Two-Factor Authentication (2FA).\n3. If this was a bot token, reset it in the Discord Developer Portal."
            : "1. Do not click unknown links or download untrusted files.\n2. Run an antivirus scan if you previously downloaded attachments from unknown sources.\n3. Change your password if your account sent this message automatically.",
        inline: false,
      },
    ],
    footer: "Zero-Trust Account Shield • Digital Vigital",
  });

  try {
    await message.author.send({ embeds: [alertEmbed] }).catch(async () => {
      // Fallback: Send temporary ephemeral notification in the channel that auto-deletes
      const reply = await (message.channel as any).send({
        content: `⚠️ <@${message.author.id}>, your message was deleted because it contained a sensitive token or suspicious link. Please check your account security.`,
      }).catch(() => null);
      if (reply) {
        setTimeout(() => reply.delete().catch(() => null), 8000);
      }
    });
  } catch (_) {}

  logger.info(
    `[TOKEN GUARD] Intercepted ${threatDetected} from ${message.author.tag} (${message.author.id}) in guild ${message.guild.id}`
  );

  return true;
}
