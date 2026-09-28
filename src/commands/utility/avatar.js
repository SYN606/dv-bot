import { SlashCommandBuilder } from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed } from "../../core/embeds.js";

const slashBuilder = new SlashCommandBuilder()
  .setName("avatar")
  .setDescription("View user avatar in high resolution")
  .addUserOption((opt) => opt.setName("user").setDescription("Target user").setRequired(false));

export default createCommand({
  name: "avatar",
  description: "View user avatar in high resolution",
  category: "Utility",
  aliases: ["av", "pfp"],
  slashBuilder,

  async execute(ctx) {
    const user = ctx.options.user ? await ctx.client.users.fetch(ctx.options.user) : ctx.user;
    const avatarUrl = user.displayAvatarURL({ size: 1024, dynamic: true });

    const embed = makeEmbed({
      title: `${user.username}'s Avatar`,
      image: avatarUrl,
      level: "INFO",
    });

    return await ctx.reply({ embeds: [embed] });
  },
});
