import { SlashCommandBuilder } from "discord.js";
import { createCommand } from "../../core/command.js";
import { keyValueEmbed } from "../../core/embeds.js";

const slashBuilder = new SlashCommandBuilder()
  .setName("whois")
  .setDescription("View comprehensive details about a server member")
  .addUserOption((opt) => opt.setName("user").setDescription("Target member").setRequired(false));

export default createCommand({
  name: "whois",
  description: "View comprehensive details about a server member",
  category: "Admin",
  aliases: ["userinfo"],
  slashBuilder,

  async execute(ctx) {
    const { guild } = ctx;
    if (!guild) return;

    const targetUser = ctx.options.user ? await ctx.client.users.fetch(ctx.options.user).catch(() => ctx.user) : ctx.user;
    const member = await guild.members.fetch(targetUser.id).catch(() => null);

    const pairs = [
      ["Username", targetUser.tag || targetUser.username],
      ["User ID", targetUser.id],
      ["Account Created", `<t:${Math.floor(targetUser.createdTimestamp / 1000)}:F> (<t:${Math.floor(targetUser.createdTimestamp / 1000)}:R>)`],
    ];

    if (member) {
      pairs.push(["Joined Server", `<t:${Math.floor(member.joinedTimestamp / 1000)}:F> (<t:${Math.floor(member.joinedTimestamp / 1000)}:R>)`]);
      pairs.push(["Highest Role", String(member.roles.highest)]);
      pairs.push(["Roles Count", String(member.roles.cache.size - 1)]);
    }

    const embed = keyValueEmbed(`User Information • ${targetUser.username}`, pairs, {
      thumbnail: targetUser.displayAvatarURL({ dynamic: true }),
      inline: false,
    });

    return await ctx.reply({ embeds: [embed] });
  },
});
