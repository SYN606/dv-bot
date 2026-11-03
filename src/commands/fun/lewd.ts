import { SlashCommandBuilder } from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed } from "../../core/embeds.js";
import {
  getAnimeActionGif,
  getAndIncrementInteraction,
  resolveTargetUser,
} from "./_animeGifs.js";

const slashBuilder = new SlashCommandBuilder()
  .setName("lewd")
  .setDescription("Call out someone or the channel for being too lewd (anime trope reaction)")
  .setDMPermission(false)
  .addUserOption((opt) =>
    opt.setName("user").setDescription("The person being too lewd (optional)").setRequired(false)
  );

export default createCommand({
  name: "lewd",
  category: "Fun",
  aliases: ["horny", "pervert", "ecchi"],
  description: "Call out someone or the channel for being too lewd (anime trope reaction)",
  usage: "[@user]",
  examples: [
    "/lewd",
    "/lewd user:@Friend",
    "dv lewd",
    "dv lewd @Friend",
  ],
  slashBuilder,

  async execute(ctx) {
    const { user, guild } = ctx;

    await ctx.defer({ ephemeral: false });

    const target = await resolveTargetUser(ctx);
    const gifUrl = await getAnimeActionGif("lewd");

    // Self callout
    if (target && target.id === user.id) {
      const embed = makeEmbed({
        title: "🙈 Lewd Thoughts Detected!",
        description: `### <@${user.id}> confesses to having dirty thoughts!\n> *B-Baka! Get your mind out of the gutter!* 😳💦`,
        level: "WARNING",
        color: 0xed4245,
        image: gifUrl,
        footer: "Bonk police have been notified 🚨",
      });
      return await ctx.reply({ embeds: [embed] });
    }

    // Callout specific user
    if (target) {
      const { count } = getAndIncrementInteraction(guild?.id, user.id, target.id, "lewd");

      const captions = [
        `🚨 **ALERT!** <@${user.id}> caught <@${target.id}> being suspiciously lewd! 😳💢`,
        `*Gasp!* <@${user.id}> looks at <@${target.id}> with pure shock: *"B-Baka, how indecent!"* 🙈✨`,
        `🚔 The anime police have arrived for <@${target.id}>, called in by <@${user.id}>! 🛑`,
        `*Hands where I can see them!* <@${user.id}> points at <@${target.id}> for extreme horni behaviour! 🚨`,
      ];
      const caption = captions[Math.floor(Math.random() * captions.length)];

      const embed = makeEmbed({
        title: "🚨 Lewd Behavior Detected!",
        description: `### ${caption}`,
        level: "ERROR",
        color: 0xed4245,
        image: gifUrl,
        footer: `Callout #${count} • Bonk squad dispatched`,
      });
      return await ctx.reply({ embeds: [embed] });
    }

    // General channel callout
    const channelCaptions = [
      `🚨 **STOP!** This chat is getting dangerously lewd! 😳💦`,
      `*FBI OPEN UP!* Too much horni energy detected in this channel! 🚔`,
      `*H-Hold on a second...* Y'all need to calm down in here right now! 🙈🛑`,
      `Holy water has been summoned to cleanse this unholy chat! 💧✨`,
    ];
    const channelCaption = channelCaptions[Math.floor(Math.random() * channelCaptions.length)];

    const embed = makeEmbed({
      title: "🚨 General Lewd Alert!",
      description: `### ${channelCaption}\n> *Action initiated by <@${user.id}>.*`,
      level: "ERROR",
      color: 0xed4245,
      image: gifUrl,
      footer: "Remember: Keep it wholesome folks! ✨",
    });

    return await ctx.reply({ embeds: [embed] });
  },
});
