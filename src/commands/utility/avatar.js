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
    let targetId = ctx.options.user;
    if (!targetId && ctx.message?.mentions?.users?.first()) {
      targetId = ctx.message.mentions.users.first().id;
    } else if (!targetId && ctx.options._args?.length > 0) {
       // fallback for raw ID
       const match = ctx.options._args[0].match(/\d{17,20}/);
       if (match) targetId = match[0];
    }
    
    const user = targetId ? await ctx.client.users.fetch(targetId).catch(() => ctx.user) : ctx.user;
    const avatarUrl = user.displayAvatarURL({ size: 1024, dynamic: true });

    const embed = makeEmbed({
      title: `${user.username}'s Avatar`,
      image: avatarUrl,
      level: "INFO",
    });

    return await ctx.reply({ embeds: [embed] });
  },
});
