import { SlashCommandBuilder } from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed } from "../../core/embeds.js";
import { getLeaderboard } from "../../db/helpers/analytics.js";

function formatSeconds(sec: any) {
  const s = Number(sec) || 0;
  const hours = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

const slashBuilder = new SlashCommandBuilder()
  .setName("leaderboard")
  .setDescription("View server chat and voice leaderboards")
  .setDMPermission(false)
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
    "dv lb all",
  ],
  slashBuilder,

  async execute(ctx) {
    const { guild } = ctx;
    if (!guild) return;

    await ctx.defer({ ephemeral: false });

    let typeArg = ctx.options.type;
    let timeframeArg = ctx.options.timeframe;

    if (!ctx.isInteraction && ctx.options._args?.length > 0) {
      const arg0 = ctx.options._args[0].toLowerCase();
      const arg1 = ctx.options._args[1]?.toLowerCase();

      // Check if first arg is actually a timeframe (e.g. !lb all, !lb weekly)
      if (["all", "total", "alltime"].includes(arg0) || ["weekly", "week"].includes(arg0)) {
        timeframeArg = arg0;
        if (arg1) typeArg = arg1;
      } else {
        typeArg = arg0;
        if (arg1) timeframeArg = arg1;
      }
    }

    typeArg = typeArg || "messages";
    timeframeArg = timeframeArg || "weekly";

    const type = ["vc", "voice", "mic", "voicetime"].includes(typeArg.toLowerCase()) ? "vc" : "messages";
    const timeframe = ["all", "total", "alltime"].includes(timeframeArg.toLowerCase()) ? "total" : "weekly";

    const rows = await getLeaderboard(guild.id, type, timeframe, 15);
    const field = `${timeframe === "weekly" ? "weekly" : "total"}_${type === "vc" ? "vc_seconds" : "messages"}`;

    const activeRows = rows.filter((r: any) => Number(r[field] || 0) > 0);

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

    const lines = activeRows.map((r: any, i: number) => {
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
