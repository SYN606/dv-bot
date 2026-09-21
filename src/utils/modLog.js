import { ModerationLogConfig } from "../db/models/index.js";
import { makeEmbed } from "../core/embeds.js";

export async function sendModLog({
  guild,
  category = "MODERATION",
  title,
  description,
  level = "INFO",
  actor = null,
  extraFields = {},
}) {
  if (!guild) return;

  try {
    const config = await ModerationLogConfig.findByPk(String(guild.id));
    if (!config || !config.enabled || !config.channel_id) return;

    const channel = guild.channels.cache.get(String(config.channel_id));
    if (!channel || !channel.send) return;

    const embed = makeEmbed({
      title: `[${category.toUpperCase()}] ${title}`,
      description,
      level,
      timestamp: new Date(),
      footer: actor ? `Action performed by ${actor.tag || actor.username || actor.id}` : null,
      footerIcon: actor?.displayAvatarURL?.() || null,
    });

    for (const [key, val] of Object.entries(extraFields)) {
      if (val !== undefined && val !== null) {
        embed.addFields({ name: `**${key}**`, value: String(val), inline: true });
      }
    }

    await channel.send({ embeds: [embed] }).catch(() => {});
  } catch (err) {
    // Audit log failures should not crash commands
  }
}
