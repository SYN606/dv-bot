import { SlashCommandBuilder } from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed } from "../../core/embeds.js";
import { getAnimeActionGif, getAndIncrementInteraction, formatInteractionFooter } from "./_animeGifs.js";

const slashBuilder = new SlashCommandBuilder()
  .setName("bonk")
  .setDescription("Bonk someone on the head and send them to horny jail")
  .addUserOption((opt) =>
    opt.setName("user").setDescription("The person you want to bonk").setRequired(true)
  );

export default createCommand({
  name: "bonk",
  category: "Fun",
  aliases: ["hammer"],
  description: "Bonk someone on the head and send them to horny jail",
  usage: "<@user>",
  examples: ["/bonk user:@Friend", "dv bonk @Friend"],
  slashBuilder,

  async execute(ctx) {
    const { client, message, user, guild } = ctx;

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
            title: "Bonk Who?",
            description: "Please mention someone you'd like to bonk! 🔨\n\n**Example:** `dv bonk @Friend` or `/bonk user:@Friend`",
            level: "WARNING",
          }),
        ],
        ephemeral: true,
      });
    }

    const gifUrl = await getAnimeActionGif("bonk");

    if (target.id === user.id) {
      const embed = makeEmbed({
        title: "🔨 Self-Bonk!",
        description: `<@${user.id}> bonked themselves on the head to clear their thoughts! *BONK!* 😵💫`,
        level: "WARNING",
        color: 0xffa801,
        image: gifUrl,
        footer: "Straight to horny jail for you!",
      });
      return await ctx.reply({ embeds: [embed] });
    }

    const { count } = getAndIncrementInteraction(guild?.id, user.id, target.id, "bonk");

    const captions = [
      `*BONK!* <@${user.id}> whacked <@${target.id}> on the noggin with a squeaky hammer! 🔨💥`,
      `<@${user.id}> just sent <@${target.id}> straight to horny jail! *No bail!* 🚔🚨`,
      `*BONK!* Go touch some grass, <@${target.id}>! Sent by <@${user.id}>! 🌱🔨`,
      `<@${user.id}> struck down the divine anime banhammer on <@${target.id}>! ⚡💥`,
      `*Clack!* <@${user.id}> bonked <@${target.id}> back to reality! 😵💫`,
    ];
    const caption = captions[Math.floor(Math.random() * captions.length)];

    const embed = makeEmbed({
      title: "🔨 Anime BONK!",
      description: `### ${caption}`,
      level: "PREMIUM",
      color: 0xffa801,
      image: gifUrl,
      footer: formatInteractionFooter(count, "bonk"),
    });

    return await ctx.reply({ embeds: [embed] });
  },
});
