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

    const embed = makeEmbed({
      title: "Pong!",
      description: `${EMOJIS.get("animated_ping") || "🏓"} **WebSocket Latency:** \`${wsPing}ms\`\n${EMOJIS.get("loading") || "⏳"} **Roundtrip Latency:** *Measuring...*`,
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
      title: "Pong!",
      description:
        `${connectionIcon} **WebSocket Latency:** \`${wsPing}ms\`\n` +
        `${EMOJIS.get("animated_ping") || "📡"} **Roundtrip Latency:** \`${roundtrip}ms\``,
      level: "INFO",
    });

    if (ctx.isInteraction) {
      await ctx.interaction.editReply({ embeds: [updated] });
    } else if (sent && sent.edit) {
      await sent.edit({ embeds: [updated] });
    }
  },
});
