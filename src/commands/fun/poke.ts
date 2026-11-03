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
  .setName("poke")
  .setDescription("Poke or boop someone to grab their attention")
  .setDMPermission(false)
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
    const { user, guild } = ctx;

    const target = await resolveTargetUser(ctx);

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

    await ctx.defer({ ephemeral: false });

    const gifUrl = await getAnimeActionGif("poke");

    if (target.id === user.id) {
      const embed = makeEmbed({
        title: "👉 Self-Boop!",
        description: `<@${user.id}> poked their own cheek in front of the mirror! *Boop!* 🤭💖`,
        level: "PREMIUM",
        color: 0x3498db,
        image: gifUrl,
        footer: "10/10 cute cheeks!",
      });
      return await ctx.reply({ embeds: [embed] });
    }

    const { count } = getAndIncrementInteraction(guild?.id, user.id, target.id, "poke");

    const captions = [
      `*Poke poke!* <@${user.id}> is repeatedly poking <@${target.id}>'s cheek! 👉✨`,
      `*Boop!* <@${user.id}> poked <@${target.id}> right on the nose! 👃💖`,
      `<@${user.id}> is poking <@${target.id}> to get their attention! *Hey, look over here!* 👀💫`,
      `*Pokey pokey!* <@${user.id}> sneaks up and prods <@${target.id}> playfully! 🤭🐾`,
    ];
    const caption = captions[Math.floor(Math.random() * captions.length)];

    const embed = makeEmbed({
      title: "👉 Playful Poke / Boop!",
      description: `### ${caption}`,
      level: "PREMIUM",
      color: 0x3498db,
      image: gifUrl,
      footer: formatInteractionFooter(count, "poke"),
    });

    return await ctx.reply({ embeds: [embed] });
  },
});
