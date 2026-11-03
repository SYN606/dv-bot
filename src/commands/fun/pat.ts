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
  .setName("pat")
  .setDescription("Gently pat someone on the head (wholesome anime headpat)")
  .setDMPermission(false)
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
    const { user, guild } = ctx;

    const target = await resolveTargetUser(ctx);

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

    await ctx.defer({ ephemeral: false });

    const gifUrl = await getAnimeActionGif("pat");

    if (target.id === user.id) {
      const embed = makeEmbed({
        title: "🌸 Self-Care Headpats!",
        description: `<@${user.id}> gently patted their own head... *You did great today, be proud of yourself!* 🌸✨`,
        level: "PREMIUM",
        color: 0x9b59b6,
        image: gifUrl,
        footer: "Sending you extra pats! 💖",
      });
      return await ctx.reply({ embeds: [embed] });
    }

    const { count } = getAndIncrementInteraction(guild?.id, user.id, target.id, "pat");

    const captions = [
      `<@${user.id}> gently patted <@${target.id}> on the head! *There there, good job!* 🌸✨`,
      `*Pat pat pat!* <@${user.id}> gives <@${target.id}> the most comforting headpats! 💖`,
      `<@${user.id}> affectionately rustled <@${target.id}>'s hair with gentle pats! ☁️💕`,
      `*Soft pats!* <@${user.id}> comforts <@${target.id}> with warm headpats! 🥺💫`,
    ];
    const caption = captions[Math.floor(Math.random() * captions.length)];

    const embed = makeEmbed({
      title: "🌸 Gentle Headpat!",
      description: `### ${caption}`,
      level: "PREMIUM",
      color: 0x9b59b6,
      image: gifUrl,
      footer: formatInteractionFooter(count, "headpat"),
    });

    return await ctx.reply({ embeds: [embed] });
  },
});
