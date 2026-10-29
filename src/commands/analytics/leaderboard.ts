import { SlashCommandBuilder } from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed } from "../../core/embeds.js";
import { getLeaderboard } from "../../db/helpers/analytics.js";

function formatSeconds(sec) {
  const s = Number(sec);
  const hours = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

const slashBuilder = new SlashCommandBuilder()
  .setName("leaderboard")
  .setDescription("View server chat and voice leaderboards")
  .addStringOption((opt) =>
    opt
      .setName("type")
      .setDescription("Leaderboard type (Messages or Voice Time)")
      .setRequired(false)
      .addChoices(
        { name: "Messages", value: "messages" },
        { name: "Voice Time", value: "vc" }
      )
  )
  .addStringOption((opt) =>
    opt
      .setName("timeframe")
      .setDescription("Weekly or All-Time")
      .setRequired(false)
      .addChoices(
        { name: "Weekly", value: "weekly" },
        { name: "All Time", value: "total" }
      )
  );

export default createCommand({
  name: "leaderboard",
  description: "View server chat and voice leaderboards",
  category: "Analytics",
  aliases: ["lb", "top"],
  usage: "[type] [timeframe]",
  examples: [
    "/leaderboard",
    "/leaderboard type:Messages timeframe:Weekly",
    "/leaderboard type:Voice Time timeframe:All Time",
    "dv leaderboard",
    "dv lb vc weekly",
  ],
  slashBuilder,

  async execute(ctx) {
    const { guild } = ctx;
    if (!guild) return;

    const typeArg = ctx.options.type || ctx.options._args?.[0] || "messages";
    const timeframeArg = ctx.options.timeframe || ctx.options._args?.[1] || "weekly";

    const type = ["vc", "voice", "mic"].includes(typeArg.toLowerCase()) ? "vc" : "messages";
    const timeframe = ["all", "total", "alltime"].includes(timeframeArg.toLowerCase()) ? "total" : "weekly";

    const rows = await getLeaderboard(guild.id, type, timeframe, 15);
    const field = `${timeframe === "weekly" ? "weekly" : "total"}_${type === "vc" ? "vc_seconds" : "messages"}`;

    const activeRows = rows.filter((r) => Number(r[field] || 0) > 0);

    if (activeRows.length === 0) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Leaderboard Empty",
            description: `No ${timeframe === "weekly" ? "weekly" : "all-time"} ${type === "vc" ? "voice" : "chat"} activity recorded yet for this server.`,
            level: "INFO",
          }),
        ],
      });
    }

    const medalIcons = ["🥇", "🥈", "🥉"];

    const lines = activeRows.map((r, i) => {
      const rank = medalIcons[i] || `\`#${(i + 1).toString().padStart(2, "0")}\``;
      const val = type === "vc" ? formatSeconds(r[field]) : `${Number(r[field]).toLocaleString()} msgs`;
      return `${rank} <@${r.user_id}> — **${val}**`;
    });

    const title = `${type === "vc" ? "🎙️ Voice" : "💬 Chat"} Leaderboard • ${timeframe === "weekly" ? "Weekly" : "All-Time"}`;

    const embed = makeEmbed({
      title,
      description: lines.join("\n"),
      level: "PREMIUM",
      footer: `Server • ${guild.name} • Tip: View top 25 & charts on the web dashboard`,
    });

    return await ctx.reply({ embeds: [embed] });
  },
});
