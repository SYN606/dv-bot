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
  .setName("bite")
  .setDescription("Playfully nibble or bite someone (anime tease)")
  .setDMPermission(false)
  .addUserOption((opt) =>
    opt.setName("user").setDescription("The person you want to bite").setRequired(true)
  );

export default createCommand({
  name: "bite",
  category: "Fun",
  aliases: ["nibble", "nom"],
  description: "Playfully nibble or bite someone (anime tease)",
  usage: "<@user>",
  examples: ["/bite user:@Friend", "dv bite @Friend"],
  slashBuilder,

  async execute(ctx) {
    const { user, guild } = ctx;

    const target = await resolveTargetUser(ctx);

    if (!target) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Bite Who?",
            description: "Please mention someone you'd like to bite! 🦷\n\n**Example:** `dv bite @Friend` or `/bite user:@Friend`",
            level: "WARNING",
          }),
        ],
        ephemeral: true,
      });
    }

    await ctx.defer({ ephemeral: false });

    const gifUrl = await getAnimeActionGif("bite");

    if (target.id === user.id) {
      const embed = makeEmbed({
        title: "🦷 Ouch!",
        description: `<@${user.id}> accidentally bit their own tongue! *Owwwie!* 😣💦`,
        level: "WARNING",
        color: 0xff6b6b,
        image: gifUrl,
        footer: "Careful there!",
      });
      return await ctx.reply({ embeds: [embed] });
    }

    const { count } = getAndIncrementInteraction(guild?.id, user.id, target.id, "bite");

    const captions = [
      `*NOM!* <@${user.id}> playfully bit <@${target.id}>! 🦷✨`,
      `<@${user.id}> took an affectionate little nibble on <@${target.id}>! 🐾💕`,
      `<@${user.id}> chomped down on <@${target.id}>'s arm! *Nom nom nom!* 😋`,
      `*Chomp!* <@${user.id}> left a playful little mark on <@${target.id}>! 🧛‍♀️`,
    ];
    const caption = captions[Math.floor(Math.random() * captions.length)];

    const embed = makeEmbed({
      title: "🦷 Playful Anime Bite!",
      description: `### ${caption}`,
      level: "PREMIUM",
      color: 0xff6b6b,
      image: gifUrl,
      footer: formatInteractionFooter(count, "bite"),
    });

    return await ctx.reply({ embeds: [embed] });
  },
});
