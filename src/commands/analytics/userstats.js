import { SlashCommandBuilder } from "discord.js";
import { createCommand } from "../../core/command.js";
import { keyValueEmbed } from "../../core/embeds.js";
import { getMemberAnalytics } from "../../db/helpers/analytics.js";

function formatSeconds(sec) {
  const s = Number(sec);
  const hours = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m ${s % 60}s`;
}

const slashBuilder = new SlashCommandBuilder()
  .setName("userstats")
  .setDescription("View member chat and voice activity statistics")
  .addUserOption((opt) => opt.setName("user").setDescription("Target member").setRequired(false));

export default createCommand({
  name: "userstats",
  description: "View member chat and voice activity statistics",
  category: "Analytics",
  aliases: ["mystats", "activity"],
  slashBuilder,

  async execute(ctx) {
    const { guild } = ctx;
    if (!guild) return;

    const targetUser = ctx.options.user ? (await ctx.client.users.fetch(ctx.options.user).catch(() => ctx.user)) : ctx.user;
    const analytics = await getMemberAnalytics(guild.id, targetUser.id);

    const pairs = [
      ["Total Messages", String(analytics.total_messages || 0)],
      ["Weekly Messages", String(analytics.weekly_messages || 0)],
      ["Total Voice Time", formatSeconds(analytics.total_vc_seconds || 0)],
      ["Weekly Voice Time", formatSeconds(analytics.weekly_vc_seconds || 0)],
      ["Last Active", analytics.last_active_at ? `<t:${Math.floor(new Date(analytics.last_active_at).getTime() / 1000)}:R>` : "*Never*"],
    ];

    const embed = keyValueEmbed(`Activity Stats • ${targetUser.username}`, pairs, {
      thumbnail: targetUser.displayAvatarURL({ dynamic: true }),
      inline: true,
    });

    return await ctx.reply({ embeds: [embed] });
  },
});
