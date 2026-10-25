import { SlashCommandBuilder } from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed } from "../../core/embeds.js";
import { getAnimeActionGif } from "./_animeGifs.js";

const slashBuilder = new SlashCommandBuilder()
  .setName("pat")
  .setDescription("Give someone a gentle, affectionate headpat")
  .addUserOption((opt) =>
    opt.setName("user").setDescription("The person you want to pat").setRequired(true)
  );

export default createCommand({
  name: "pat",
  category: "Fun",
  aliases: ["headpat"],
  description: "Give someone a gentle, affectionate headpat",
  usage: "<@user>",
  examples: ["/pat user:@Friend", "dv pat @Friend"],
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
            title: "Pat Who?",
            description: "Please mention the user you want to give a headpat to! 🐾\n\n**Example:** `dv pat @Friend`",
            level: "WARNING",
          }),
        ],
        ephemeral: true,
      });
    }

    const gifUrl = await getAnimeActionGif("pat");

    if (target.id === user.id) {
      const embed = makeEmbed({
        title: "✨ Gentle Headpat!",
        description: `*Pats <@${user.id}> on the head gently.* There, there, you did an amazing job today! 🌸`,
        level: "PREMIUM",
        color: 0x00e5ff,
        image: gifUrl,
        footer: "Good job! You deserve a headpat.",
      });
      return await ctx.reply({ embeds: [embed] });
    }

    const captions = [
      `<@${user.id}> gently patted <@${target.id}> on the head! 🐾 *pat pat*`,
      `<@${user.id}> gives <@${target.id}> sweet, soothing headpats! 🌸`,
      `*pat pat!* <@${user.id}> pets <@${target.id}> like a good companion! ✨`,
    ];
    const caption = captions[Math.floor(Math.random() * captions.length)];

    const embed = makeEmbed({
      title: "🌸 Gentle Headpat!",
      description: `### ${caption}`,
      level: "PREMIUM",
      color: 0x00e5ff,
      image: gifUrl,
      footer: "Wholesome headpats for everyone.",
    });

    return await ctx.reply({ embeds: [embed] });
  },
});
