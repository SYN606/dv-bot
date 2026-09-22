import { SlashCommandBuilder } from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed } from "../../core/embeds.js";
import { EMOJIS } from "../../core/emojis.js";

const slashBuilder = new SlashCommandBuilder()
  .setName("ping")
  .setDescription("Check bot latency and gateway connection health");

export default createCommand({
  name: "ping",
  description: "Check bot latency and gateway connection health",
  category: "Utility",
  slashBuilder,

  async execute(ctx) {
    const wsPing = Math.round(ctx.client.ws.ping);
    const start = Date.now();

    const avatar = ctx.client.user?.displayAvatarURL({ dynamic: true, size: 256 });

    const embed = makeEmbed({
      author: {
        name: "Gateway & Connectivity",
        iconURL: avatar,
      },
      title: "🏓 Pong!",
      description: `📡 **WebSocket Latency:** \`${wsPing}ms\`\n⏳ **Roundtrip Latency:** *Measuring...*`,
      thumbnail: avatar,
      level: "INFO",
    });

    const sent = await ctx.reply({ embeds: [embed] });
    const roundtrip = Date.now() - start;

    const connectionIcon =
      roundtrip < 150
        ? EMOJIS.get("good_connection") || "🟢"
        : roundtrip < 300
        ? EMOJIS.get("okay_connection") || "🟡"
        : EMOJIS.get("bad_connection") || "🔴";

    const updated = makeEmbed({
      author: {
        name: "Gateway & Connectivity",
        iconURL: avatar,
      },
      title: "🏓 Pong!",
      description:
        `${connectionIcon} **WebSocket Latency:** \`${wsPing}ms\`\n` +
        `📡 **Roundtrip Latency:** \`${roundtrip}ms\``,
      thumbnail: avatar,
      level: "INFO",
    });

    if (ctx.isInteraction) {
      await ctx.interaction.editReply({ embeds: [updated] });
    } else if (sent && sent.edit) {
      await sent.edit({ embeds: [updated] });
    }
  },
});
