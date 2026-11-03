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
  .setName("hug")
  .setDescription("Give someone a warm, comforting anime hug")
  .setDMPermission(false)
  .addUserOption((opt) =>
    opt.setName("user").setDescription("The person you want to hug").setRequired(true)
  );

export default createCommand({
  name: "hug",
  category: "Fun",
  aliases: ["embrace", "bearhug"],
  description: "Give someone a warm, comforting anime hug",
  usage: "<@user>",
  examples: ["/hug user:@Friend", "dv hug @Friend"],
  slashBuilder,

  async execute(ctx) {
    const { user, guild } = ctx;

    const target = await resolveTargetUser(ctx);

    if (!target) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Hug Who?",
            description: "Please mention someone you'd like to hug! 🤗\n\n**Example:** `dv hug @Friend` or `/hug user:@Friend`",
            level: "WARNING",
          }),
        ],
        ephemeral: true,
      });
    }

    await ctx.defer({ ephemeral: false });

    const gifUrl = await getAnimeActionGif("hug");

    if (target.id === user.id) {
      const embed = makeEmbed({
        title: "🤗 Self-Hug & Wholesome Vibes!",
        description: `<@${user.id}> wrapped their arms around themselves... here is a big virtual hug from me too! 🤗💖`,
        level: "PREMIUM",
        color: 0x57f287,
        image: gifUrl,
        footer: "You are doing amazing today!",
      });
      return await ctx.reply({ embeds: [embed] });
    }

    const { count } = getAndIncrementInteraction(guild?.id, user.id, target.id, "hug");

    const captions = [
      `<@${user.id}> ran up and gave <@${target.id}> the warmest, tightest hug! 🤗💖`,
      `<@${user.id}> wrapped their arms around <@${target.id}> gently! 🌸✨`,
      `*Aww!* <@${user.id}> pulled <@${target.id}> into a big wholesome bear hug! 🐻💕`,
      `<@${user.id}> gave <@${target.id}> a sweet, comforting embrace! 🥺💫`,
    ];
    const caption = captions[Math.floor(Math.random() * captions.length)];

    const embed = makeEmbed({
      title: "🤗 Warm Anime Hug!",
      description: `### ${caption}`,
      level: "PREMIUM",
      color: 0x57f287,
      image: gifUrl,
      footer: formatInteractionFooter(count, "hug"),
    });

    return await ctx.reply({ embeds: [embed] });
  },
});
