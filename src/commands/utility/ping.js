import { SlashCommandBuilder } from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed } from "../../core/embeds.js";
import { EMOJIS } from "../../core/emojis.js";

const slashBuilder = new SlashCommandBuilder()
  .setName("ping")
  .setDescription("Display bot connection status and real-time latency metrics.");

export default createCommand({
  name: "ping",
  description: "Measure WebSocket gateway heartbeat and HTTP API round-trip latency.",
  category: "Utility",
  slashBuilder,

  async execute(ctx) {
    const { message, interaction, client } = ctx;
    const startTime = performance.now();

    // Emoji retrievals with safe defaults using your EmojiRegistry.get() method
    const loading_icon = EMOJIS.get("loading", "⏳");
    const ping_icon = EMOJIS.get("animated_ping", "📡");
    const success_icon = EMOJIS.get("success", "✅");
    const arrow_icon = EMOJIS.get("arrow_point", "▶");
    const bullet_icon = EMOJIS.get("green_dot", "•");
    const warning_icon = EMOJIS.get("warning", "⚠️");

    // Send initial measurement message
    const initialEmbed = makeEmbed({
      title: "Measuring Latency...",
      description: `${loading_icon} Gathering diagnostic telemetry...`,
      level: "DEBUG",
      timestamp: false,
    });

    const sent = await ctx.reply({ embeds: [initialEmbed], fetchReply: true });

    // Calculate HTTP API Round-Trip Time
    const api_latency = Math.round(performance.now() - startTime);

    // Gateway WebSocket Latency
    const gateway_latency = Math.round(client.ws.ping);
    const overall_latency = Math.max(api_latency, gateway_latency);

    // Connection status evaluation
    let status_text = "";
    let status_level = "SUCCESS";

    if (overall_latency < 200) {
      status_text = `${bullet_icon} Excellent`;
      status_level = "SUCCESS";
    } else if (overall_latency < 400) {
      status_text = `${success_icon} Good`;
      status_level = "INFO";
    } else {
      status_text = `${warning_icon} High Latency`;
      status_level = "WARNING";
    }

    const authorUser = interaction ? interaction.user : message.author;

    const embed = makeEmbed({
      title: `${ping_icon} System Health & Latency`,
      description: 
        `${success_icon} Bot is online and fully operational.\n\n` +
        `${arrow_icon} **Live Connection Diagnostics:**`,
      level: status_level,
      fields: [
        { name: "WebSocket Gateway", value: `${bullet_icon} \`${gateway_latency} ms\``, inline: true },
        { name: "HTTP API Response", value: `${bullet_icon} \`${api_latency} ms\``, inline: true },
        { name: "Connection Quality", value: status_text, inline: true },
      ],
      footer: `Requested by ${authorUser.tag}`,
      footerIcon: authorUser.displayAvatarURL({ size: 256, extension: "png" }),
    });

    if (ctx.isInteraction) {
      await interaction.editReply({ embeds: [embed] });
    } else if (sent && sent.edit) {
      await sent.edit({ embeds: [embed] });
    }

    // Optional text-invocation cleanup
    if (message) {
      try {
        await message.delete().catch(() => {});
      } catch (err) {}
    }
  },
});
