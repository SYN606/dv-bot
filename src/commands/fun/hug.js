import { SlashCommandBuilder } from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed } from "../../core/embeds.js";
import { getAnimeActionGif } from "./_animeGifs.js";

const slashBuilder = new SlashCommandBuilder()
  .setName("hug")
  .setDescription("Give someone a warm, comforting hug")
  .addUserOption((opt) =>
    opt.setName("user").setDescription("The person you want to hug").setRequired(true)
  );

export default createCommand({
  name: "hug",
  category: "Fun",
  aliases: ["cuddle"],
  description: "Give someone a warm, comforting hug",
  usage: "<@user>",
  examples: ["/hug user:@Friend", "dv hug @Friend"],
  slashBuilder,

  async execute(ctx) {
    const { client, message, user } = ctx;

    let target = null;
    if (ctx.options.user) {
      target = await client.users.fetch(ctx.options.user).catch(() => null);
    } else if (message?.mentions?.users?.size > 0) {
      target = message.mentions.users.first();
    } else if (ctx.options._args?.length > 0) {
      const match = ctx.options.raw?.match(/\d{17,20}/);
      if (match) {
        target = await client.users.fetch(match[0]).catch(() => null);
      }
    }

    if (!target) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Hug Who?",
            description: "Please mention someone you'd like to hug! 🤗\n\n**Example:** `dv hug @Friend`",
            level: "WARNING",
          }),
        ],
        ephemeral: true,
      });
    }

    const gifUrl = await getAnimeActionGif("hug");

    if (target.id === user.id) {
      const embed = makeEmbed({
        title: "🤗 Self-Hug!",
        description: `<@${user.id}> wrapped their arms around themselves... here is a big virtual hug from me too! 🤗💖`,
        level: "PREMIUM",
        color: 0x57f287,
        image: gifUrl,
        footer: "You are doing great!",
      });
      return await ctx.reply({ embeds: [embed] });
    }

    const captions = [
      `<@${user.id}> gave <@${target.id}> a big, warm, and cozy hug! 🤗✨`,
      `<@${user.id}> wrapped <@${target.id}> in a tight, comforting embrace! 💖`,
      `<@${user.id}> squeezed <@${target.id}> with pure warmth and affection! 🌸`,
    ];
    const caption = captions[Math.floor(Math.random() * captions.length)];

    const embed = makeEmbed({
      title: "🤗 Warm Hug!",
      description: `### ${caption}`,
      level: "PREMIUM",
      color: 0x57f287,
      image: gifUrl,
      footer: "Spreading warmth and wholesome energy.",
    });

    return await ctx.reply({ embeds: [embed] });
  },
});
