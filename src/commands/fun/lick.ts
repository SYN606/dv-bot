import { SlashCommandBuilder } from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed } from "../../core/embeds.js";
import {
  getAnimeActionGif,
  getAndIncrementInteraction,
  formatInteractionFooter,
  resolveTargetUser,
} from "./_animeGifs.js";

const slashBuilder = new SlashCommandBuilder()
  .setName("lick")
  .setDescription("Playfully lick someone (anime style teasing)")
  .setDMPermission(false)
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
    const { user, guild } = ctx;

    const target = await resolveTargetUser(ctx);

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

    await ctx.defer({ ephemeral: false });

    const gifUrl = await getAnimeActionGif("lick");

    if (target.id === user.id) {
      const embed = makeEmbed({
        title: "👅 Cat Mode Activated!",
        description: `<@${user.id}> is licking their own paw like an adorable cat! 🐱🐾`,
        level: "PREMIUM",
        color: 0xff7979,
        image: gifUrl,
        footer: "*Nyaa~* Purring contentedly ✨",
      });
      return await ctx.reply({ embeds: [embed] });
    }

    const { count } = getAndIncrementInteraction(guild?.id, user.id, target.id, "lick");

    const captions = [
      `*Mlem!* <@${user.id}> playfully licked <@${target.id}>'s cheek! 👅✨`,
      `<@${user.id}> gave <@${target.id}> a mischievous anime lick! *Tastes like sweetness!* 🍭💕`,
      `*Slurp!* <@${user.id}> surprised <@${target.id}> with a sudden lick! 🐱💖`,
      `<@${user.id}> booped and licked <@${target.id}> right on the nose! 👃👅`,
    ];
    const caption = captions[Math.floor(Math.random() * captions.length)];

    const embed = makeEmbed({
      title: "👅 Anime Lick!",
      description: `### ${caption}`,
      level: "PREMIUM",
      color: 0xff7979,
      image: gifUrl,
      footer: formatInteractionFooter(count, "lick"),
    });

    return await ctx.reply({ embeds: [embed] });
  },
});
