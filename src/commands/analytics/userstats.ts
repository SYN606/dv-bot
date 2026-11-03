import { SlashCommandBuilder } from "discord.js";
import { createCommand } from "../../core/command.js";
import { keyValueEmbed } from "../../core/embeds.js";
import { getMemberAnalytics } from "../../db/helpers/analytics.js";

function formatSeconds(sec: any) {
  const s = Number(sec) || 0;
  const hours = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m ${s % 60}s`;
}

const slashBuilder = new SlashCommandBuilder()
  .setName("userstats")
  .setDescription("View member chat and voice activity statistics")
  .setDMPermission(false)
  .addUserOption((opt) => opt.setName("user").setDescription("Target member").setRequired(false));

export default createCommand({
  name: "userstats",
  description: "View member chat and voice activity statistics",
  category: "Analytics",
  aliases: ["mystats", "activity"],
  usage: "[user]",
  examples: [
    "/userstats",
    "/userstats user:@User",
    "dvuserstats @User",
    "dvmystats",
  ],
  slashBuilder,

  async execute(ctx) {
    const { guild, client, user } = ctx;
    if (!guild) return;

    await ctx.defer({ ephemeral: false });

    let targetUser = user;
    const rawTarget =
      ctx.options.user ||
      ctx.options.primary ||
      ctx.options._args?.[0];

    if (rawTarget) {
      const targetUserId =
        typeof rawTarget === "string"
          ? rawTarget.match(/\d{17,20}/)?.[0]
          : rawTarget?.id;

      if (targetUserId) {
        targetUser = (await client.users.fetch(targetUserId).catch(() => null)) || user;
      }
    }

    const analytics = await getMemberAnalytics(guild.id, targetUser.id);

    const pairs: [string, any][] = [
      ["Total Messages", Number(analytics?.total_messages || 0).toLocaleString()],
      ["Weekly Messages", Number(analytics?.weekly_messages || 0).toLocaleString()],
      ["Total Voice Time", formatSeconds(analytics?.total_vc_seconds || 0)],
      ["Weekly Voice Time", formatSeconds(analytics?.weekly_vc_seconds || 0)],
      [
        "Last Active",
        analytics?.last_active_at
          ? `<t:${Math.floor(new Date(analytics.last_active_at).getTime() / 1000)}:R>`
          : "*Never*",
      ],
    ];

    const avatarUrl =
      typeof targetUser.displayAvatarURL === "function"
        ? targetUser.displayAvatarURL()
        : null;

    const embed = keyValueEmbed(`Activity Stats • ${targetUser.username}`, pairs, {
      thumbnail: avatarUrl,
      inline: true,
    });

    return await ctx.reply({ embeds: [embed] });
  },
});
