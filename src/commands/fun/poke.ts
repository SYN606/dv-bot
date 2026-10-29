import { SlashCommandBuilder } from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed } from "../../core/embeds.js";
import { getAnimeActionGif, getAndIncrementInteraction, formatInteractionFooter } from "./_animeGifs.js";

const slashBuilder = new SlashCommandBuilder()
  .setName("poke")
  .setDescription("Poke or boop someone to grab their attention")
  .addUserOption((opt) =>
    opt.setName("user").setDescription("The person you want to poke").setRequired(true)
  );

export default createCommand({
  name: "poke",
  category: "Fun",
  aliases: ["boop"],
  description: "Poke or boop someone to grab their attention",
  usage: "<@user>",
  examples: ["/poke user:@Friend", "dv poke @Friend", "dv boop @Friend"],
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
            title: "Poke Who?",
            description: "Please mention someone you'd like to poke! 👉\n\n**Example:** `dv poke @Friend` or `/poke user:@Friend`",
            level: "WARNING",
          }),
        ],
        ephemeral: true,
      });
    }

    const gifUrl = await getAnimeActionGif("poke");

    if (target.id === user.id) {
      const embed = makeEmbed({
        title: "👉 Self-Boop!",
        description: `<@${user.id}> poked their own cheek in the mirror! *Boop!* 🪞✨`,
        level: "PREMIUM",
        color: 0x54a0ff,
        image: gifUrl,
        footer: "Hey, wake up!",
      });
      return await ctx.reply({ embeds: [embed] });
    }

    const { count } = getAndIncrementInteraction(guild?.id, user.id, target.id, "poke");

    const captions = [
      `*Poke poke poke!* <@${user.id}> is poking <@${target.id}> for attention! 👉✨`,
      `<@${user.id}> gently poked <@${target.id}>'s cheek! *Boop!* 🌸`,
      `*Hey! Listen!* <@${user.id}> keeps poking <@${target.id}> repeatedly! 🫵😆`,
      `<@${user.id}> gave <@${target.id}> a sly little boop on the nose! 👃✨`,
      `<@${user.id}> pokes <@${target.id}>... *Notice me senpai!* 🥺👉👈`,
    ];
    const caption = captions[Math.floor(Math.random() * captions.length)];

    const embed = makeEmbed({
      title: "👉 Playful Poke / Boop!",
      description: `### ${caption}`,
      level: "PREMIUM",
      color: 0x54a0ff,
      image: gifUrl,
      footer: formatInteractionFooter(count, "poke"),
    });

    return await ctx.reply({ embeds: [embed] });
  },
});
