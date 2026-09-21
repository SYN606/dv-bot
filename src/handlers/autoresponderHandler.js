import { getGuildAutoresponders } from "../db/helpers/autoresponder.js";
import { makeEmbed } from "../core/embeds.js";

const responderCooldowns = new Map(); // `${responderId}:${userId}` -> timestamp

export async function handleAutoresponder(message) {
  if (!message.guild) return;

  const responders = await getGuildAutoresponders(message.guild.id);
  if (!responders || responders.length === 0) return;

  const content = message.content.trim().toLowerCase();
  const rawContent = message.content.trim();

  for (const ar of responders) {
    if (!ar.enabled) continue;
    if (ar.ignore_bots && message.author.bot) continue;

    // Check cooldown
    if (ar.cooldown > 0) {
      const cdKey = `${ar.responder_id}:${message.author.id}`;
      const last = responderCooldowns.get(cdKey) || 0;
      const now = Date.now() / 1000;
      if (now - last < ar.cooldown) continue;
      responderCooldowns.set(cdKey, now);
    }

    const trigger = ar.trigger_phrase.toLowerCase();
    let matched = false;

    switch (ar.match_type) {
      case "exact":
        matched = content === trigger;
        break;
      case "startswith":
        matched = content.startsWith(trigger);
        break;
      case "endswith":
        matched = content.endsWith(trigger);
        break;
      case "regex":
        try {
          const re = new RegExp(ar.trigger_phrase, "i");
          matched = re.test(rawContent);
        } catch {
          matched = false;
        }
        break;
      case "contains":
      default:
        matched = content.includes(trigger);
        break;
    }

    if (matched) {
      // 1. Dispatch reply
      if (ar.is_embed && ar.reply_content) {
        const embed = makeEmbed({
          title: ar.embed_title || "Auto Response",
          description: ar.reply_content,
          image: ar.image_url || null,
          level: "INFO",
        });
        await message.channel.send({ embeds: [embed] }).catch(() => {});
      } else if (ar.reply_content) {
        await message.channel.send(ar.reply_content).catch(() => {});
      }

      // 2. Dispatch reaction emojis
      if (ar.reactions && ar.reactions.length > 0) {
        for (const r of ar.reactions) {
          await message.react(r.emoji).catch(() => {});
        }
      }

      // 3. Delete trigger message if configured
      if (ar.delete_trigger && message.deletable) {
        await message.delete().catch(() => {});
      }

      break;
    }
  }
}
