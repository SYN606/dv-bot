import { SlashCommandBuilder } from "discord.js";
import { createCommand } from "../../core/command.js";
import { keyValueEmbed } from "../../core/embeds.js";

const slashBuilder = new SlashCommandBuilder()
  .setName("serverinfo")
  .setDescription("View detailed server information and statistics");

export default createCommand({
  name: "serverinfo",
  description: "View detailed server information and statistics",
  category: "Utility",
  aliases: ["si", "server"],
  slashBuilder,

  async execute(ctx) {
    const { guild } = ctx;
    if (!guild) return;

    const owner = await guild.fetchOwner().catch(() => null);
    const channels = guild.channels.cache;
    const members = guild.memberCount;
    const roles = guild.roles.cache.size;

    const pairs = [
      ["Server Name", guild.name],
      ["Server ID", guild.id],
      ["Owner", owner ? `<@${owner.id}> (${owner.user.tag})` : "Unknown"],
      ["Members", String(members)],
      ["Channels", String(channels.size)],
      ["Roles", String(roles)],
      ["Created At", `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`],
      ["Boost Level", `Tier ${guild.premiumTier} (${guild.premiumSubscriptionCount || 0} boosts)`],
    ];

    const embed = keyValueEmbed(`Server Info • ${guild.name}`, pairs, {
      thumbnail: guild.iconURL({ dynamic: true }),
      inline: true,
    });

    return await ctx.reply({ embeds: [embed] });
  },
});
