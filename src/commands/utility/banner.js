import { SlashCommandBuilder } from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed } from "../../core/embeds.js";
import { EMOJIS } from "../../core/emojis.js";

const slashBuilder = new SlashCommandBuilder()
  .setName("banner")
  .setDescription("View user banner in high resolution")
  .addUserOption((opt) => opt.setName("user").setDescription("Target user").setRequired(false));

export default createCommand({
  name: "banner",
  description: "View user banner in high resolution",
  category: "Utility",
  slashBuilder,

  async execute(ctx) {
    const user = ctx.options.user ? await ctx.client.users.fetch(ctx.options.user, { force: true }) : await ctx.client.users.fetch(ctx.user.id, { force: true });
    const bannerUrl = user.bannerURL({ size: 1024, dynamic: true });

    if (!bannerUrl) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "No Banner",
            description: `${EMOJIS.get("warning") || "⚠️"} **${user.username}** does not have a profile banner set.`,
            level: "WARNING",
          }),
        ],
      });
    }

    const embed = makeEmbed({
      title: `${user.username}'s Banner`,
      image: bannerUrl,
      level: "INFO",
    });

    return await ctx.reply({ embeds: [embed] });
  },
});
