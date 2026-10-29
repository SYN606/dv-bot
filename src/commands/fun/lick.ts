import { SlashCommandBuilder } from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed } from "../../core/embeds.js";
import { getAnimeActionGif, getAndIncrementInteraction, formatInteractionFooter } from "./_animeGifs.js";

const slashBuilder = new SlashCommandBuilder()
  .setName("lick")
  .setDescription("Playfully lick someone (anime style teasing)")
  .addUserOption((opt) =>
    opt.setName("user").setDescription("The person you want to lick").setRequired(true)
  );

export default createCommand({
  name: "lick",
  category: "Fun",
  aliases: ["slurp", "taste"],
  description: "Playfully lick someone (anime style teasing)",
  usage: "<@user>",
  examples: ["/lick user:@Friend", "dv lick @Friend"],
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
            title: "Lick Who?",
            description: "Please mention someone you'd like to lick! 👅\n\n**Example:** `dv lick @Friend` or `/lick user:@Friend`",
            level: "WARNING",
          }),
        ],
        ephemeral: true,
      });
    }

    const gifUrl = await getAnimeActionGif("lick");

    if (target.id === user.id) {
      const embed = makeEmbed({
        title: "👅 Cat Mode Activated!",
        description: `<@${user.id}> groomed their own paw like a curious anime cat! 🐾✨`,
        level: "PREMIUM",
        color: 0xff9f43,
        image: gifUrl,
        footer: "Nya~ curious feline behavior!",
      });
      return await ctx.reply({ embeds: [embed] });
    }

    const { count } = getAndIncrementInteraction(guild?.id, user.id, target.id, "lick");

    const captions = [
      `<@${user.id}> gave <@${target.id}> a playful anime lick on the cheek! *Mlem~* 👅✨`,
      `*LICK!* <@${user.id}> tasted <@${target.id}>: *“This is the taste of a liar!”* 🕵️‍♂️👅`,
      `<@${user.id}> playfully licked <@${target.id}>! Pure chaotic teasing energy! 😜`,
      `<@${user.id}> snuck up and gave <@${target.id}> a mischievous anime lick! 🐾💕`,
    ];
    const caption = captions[Math.floor(Math.random() * captions.length)];

    const embed = makeEmbed({
      title: "👅 Playful Anime Lick!",
      description: `### ${caption}`,
      level: "PREMIUM",
      color: 0xff9f43,
      image: gifUrl,
      footer: formatInteractionFooter(count, "lick"),
    });

    return await ctx.reply({ embeds: [embed] });
  },
});
