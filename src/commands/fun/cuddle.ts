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
  .setName("cuddle")
  .setDescription("Snuggle and cuddle up with someone in a cozy embrace")
  .setDMPermission(false)
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
    const { user, guild } = ctx;

    const target = await resolveTargetUser(ctx);

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

    await ctx.defer({ ephemeral: false });

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
      `<@${user.id}> curled up and snuggled closely with <@${target.id}>! 🧸💖`,
      `<@${user.id}> pulled <@${target.id}> into a super cozy, warm cuddle! 🌸✨`,
      `<@${user.id}> and <@${target.id}> are sharing the softest cuddle session! ☁️💤`,
      `*Aww!* <@${user.id}> is sweetly wrapping a blanket around <@${target.id}>! 💕`,
    ];
    const caption = captions[Math.floor(Math.random() * captions.length)];

    const embed = makeEmbed({
      title: "🧸 Sweet Anime Cuddle!",
      description: `### ${caption}`,
      level: "PREMIUM",
      color: 0xff9ff3,
      image: gifUrl,
      footer: formatInteractionFooter(count, "cuddle"),
    });

    return await ctx.reply({ embeds: [embed] });
  },
});
