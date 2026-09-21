import { SlashCommandBuilder } from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed } from "../../core/embeds.js";
import { EMOJIS } from "../../core/emojis.js";
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
      .setDescription("Leaderboard type")
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
        { name: "All Time", value: "total" },
        { name: "Weekly", value: "weekly" }
      )
  );

export default createCommand({
  name: "leaderboard",
  description: "View server chat and voice leaderboards",
  category: "Analytics",
  aliases: ["lb", "top"],
  slashBuilder,

  async execute(ctx) {
    const { guild } = ctx;
    if (!guild) return;

    const type = ctx.options.type || "messages";
    const timeframe = ctx.options.timeframe || "total";

    const rows = await getLeaderboard(guild.id, type, timeframe, 10);

    if (rows.length === 0) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Leaderboard Empty",
            description: "No activity records found yet for this server.",
            level: "INFO",
          }),
        ],
      });
    }

    const field = `${timeframe === "weekly" ? "weekly" : "total"}_${type === "vc" ? "vc_seconds" : "messages"}`;
    const medalIcons = ["🥇", "🥈", "🥉"];

    const lines = rows.map((r, i) => {
      const rank = medalIcons[i] || `**#${i + 1}**`;
      const val = type === "vc" ? formatSeconds(r[field]) : `${r[field]} msgs`;
      return `${rank} <@${r.user_id}> — **${val}**`;
    });

    const title = `${type === "vc" ? "🎤 Voice" : "💬 Chat"} Leaderboard • ${timeframe === "weekly" ? "Weekly" : "All-Time"}`;

    const embed = makeEmbed({
      title,
      description: lines.join("\n"),
      level: "ANALYTICS",
      footer: `Server • ${guild.name}`,
    });

    return await ctx.reply({ embeds: [embed] });
  },
});
