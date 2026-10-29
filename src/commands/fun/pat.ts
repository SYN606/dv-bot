import { SlashCommandBuilder } from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed } from "../../core/embeds.js";
import { getAnimeActionGif, getAndIncrementInteraction, formatInteractionFooter } from "./_animeGifs.js";

const slashBuilder = new SlashCommandBuilder()
  .setName("pat")
  .setDescription("Gently pat someone on the head (wholesome anime headpat)")
  .addUserOption((opt) =>
    opt.setName("user").setDescription("The person you want to headpat").setRequired(true)
  );

export default createCommand({
  name: "pat",
  category: "Fun",
  aliases: ["headpat", "pet"],
  description: "Gently pat someone on the head (wholesome anime headpat)",
  usage: "<@user>",
  examples: ["/pat user:@Friend", "dv pat @Friend"],
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
            title: "Headpat Who?",
            description: "Please mention someone you'd like to give gentle headpats to! 🌸\n\n**Example:** `dv pat @Friend` or `/pat user:@Friend`",
            level: "WARNING",
          }),
        ],
        ephemeral: true,
      });
    }

    const gifUrl = await getAnimeActionGif("pat");

    if (target.id === user.id) {
      const embed = makeEmbed({
        title: "✨ Gentle Self-Care Headpat!",
        description: `<@${user.id}> patted their own head... *There there, you're doing your best!* 🥺💖`,
        level: "PREMIUM",
        color: 0x54a0ff,
        image: gifUrl,
        footer: "Good job today!",
      });
      return await ctx.reply({ embeds: [embed] });
    }

    const { count } = getAndIncrementInteraction(guild?.id, user.id, target.id, "headpat");

    const captions = [
      `<@${user.id}> gently patted <@${target.id}> on the head! *Pat pat~* 🌸`,
      `<@${user.id}> ruffled <@${target.id}>'s hair with sweet affection! ✨🥺`,
      `<@${user.id}> showered <@${target.id}> with warm, wholesome headpats! 💖`,
      `<@${user.id}> placed a soft hand on <@${target.id}>'s head: *“Good job, you did great!”* 🌟`,
      `*Pat pat pat!* <@${user.id}> treats <@${target.id}> to the ultimate comfort headpat! 🧸`,
    ];
    const caption = captions[Math.floor(Math.random() * captions.length)];

    const embed = makeEmbed({
      title: "🌸 Gentle Headpat!",
      description: `### ${caption}`,
      level: "PREMIUM",
      color: 0x54a0ff,
      image: gifUrl,
      footer: formatInteractionFooter(count, "headpat"),
    });

    return await ctx.reply({ embeds: [embed] });
  },
});
