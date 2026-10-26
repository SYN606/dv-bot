import { SlashCommandBuilder } from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed } from "../../core/embeds.js";
import { getAnimeActionGif, getAndIncrementInteraction, formatInteractionFooter } from "./_animeGifs.js";

const slashBuilder = new SlashCommandBuilder()
  .setName("cuddle")
  .setDescription("Snuggle and cuddle up with someone in a cozy embrace")
  .addUserOption((opt) =>
    opt.setName("user").setDescription("The person you want to cuddle").setRequired(true)
  );

export default createCommand({
  name: "cuddle",
  category: "Fun",
  aliases: ["snuggle"],
  description: "Snuggle and cuddle up with someone in a cozy embrace",
  usage: "<@user>",
  examples: ["/cuddle user:@Friend", "dv cuddle @Friend"],
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
            title: "Cuddle Who?",
            description: "Please mention someone you'd like to cuddle with! 🧸\n\n**Example:** `dv cuddle @Friend` or `/cuddle user:@Friend`",
            level: "WARNING",
          }),
        ],
        ephemeral: true,
      });
    }

    const gifUrl = await getAnimeActionGif("cuddle");

    if (target.id === user.id) {
      const embed = makeEmbed({
        title: "🧸 Cozy Self-Cuddle!",
        description: `<@${user.id}> curled up into a warm blanket burrito with their favorite plushie! 💤💖`,
        level: "PREMIUM",
        color: 0xff9ff3,
        image: gifUrl,
        footer: "Maximum cozy vibes ✨",
      });
      return await ctx.reply({ embeds: [embed] });
    }

    const { count } = getAndIncrementInteraction(guild?.id, user.id, target.id, "cuddle");

    const captions = [
      `<@${user.id}> pulled <@${target.id}> into a warm, cozy snuggle! 🧸✨`,
      `<@${user.id}> curled up next to <@${target.id}> for a sweet cuddle session! 🌸💕`,
      `<@${user.id}> and <@${target.id}> are snuggled together under a fluffy blanket! 💤💖`,
      `<@${user.id}> cuddled <@${target.id}> closely, keeping them safe and warm! 🥺💫`,
    ];
    const caption = captions[Math.floor(Math.random() * captions.length)];

    const embed = makeEmbed({
      title: "🧸 Cozy Anime Cuddle!",
      description: `### ${caption}`,
      level: "PREMIUM",
      color: 0xff9ff3,
      image: gifUrl,
      footer: formatInteractionFooter(count, "cuddle"),
    });

    return await ctx.reply({ embeds: [embed] });
  },
});
