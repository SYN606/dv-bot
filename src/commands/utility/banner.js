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
  aliases: ["userbanner"],
  usage: "[user]",
  examples: [
    "/banner",
    "/banner user:@User",
    "dvbanner @User",
  ],
  slashBuilder,

  async execute(ctx) {
    let targetId = ctx.options.user;
    if (!targetId && ctx.message?.mentions?.users?.first()) {
      targetId = ctx.message.mentions.users.first().id;
    } else if (!targetId && ctx.options._args?.length > 0) {
       const match = ctx.options._args[0].match(/\d{17,20}/);
       if (match) targetId = match[0];
    }
    
    targetId = targetId || ctx.user.id;
    const user = await ctx.client.users.fetch(targetId, { force: true }).catch(() => ctx.user);
    const bannerUrl = user.bannerURL?.({ size: 1024, dynamic: true }) || null;

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
