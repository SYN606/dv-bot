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
  .setName("slap")
  .setDescription("Dramatically slap someone across the face (anime style)")
  .setDMPermission(false)
  .addUserOption((opt) =>
    opt.setName("user").setDescription("The person you want to slap").setRequired(true)
  );

export default createCommand({
  name: "slap",
  category: "Fun",
  aliases: ["smack"],
  description: "Dramatically slap someone across the face (anime style)",
  usage: "<@user>",
  examples: ["/slap user:@Friend", "dv slap @Friend"],
  slashBuilder,

  async execute(ctx) {
    const { user, guild } = ctx;

    const target = await resolveTargetUser(ctx);

    if (!target) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Slap Who?",
            description: "Please mention the user who deserves a dramatic anime slap! 👋\n\n**Example:** `dv slap @Friend` or `/slap user:@Friend`",
            level: "WARNING",
          }),
        ],
        ephemeral: true,
      });
    }

    await ctx.defer({ ephemeral: false });

    const gifUrl = await getAnimeActionGif("slap");

    if (target.id === user.id) {
      const embed = makeEmbed({
        title: "🤦‍♂️ Wake-Up Slap!",
        description: `<@${user.id}> slapped both their cheeks to snap out of a trance! *Get it together!* 💥😵`,
        level: "WARNING",
        color: 0xe74c3c,
        image: gifUrl,
        footer: "Now you're fully awake!",
      });
      return await ctx.reply({ embeds: [embed] });
    }

    const { count } = getAndIncrementInteraction(guild?.id, user.id, target.id, "slap");

    const captions = [
      `*SLAP!* <@${user.id}> hit <@${target.id}> with a dramatic anime hand strike! 💥👋`,
      `*B-Baka!* <@${user.id}> delivered a stinging slap right to <@${target.id}>'s cheek! 💢😡`,
      `*KABLAM!* <@${user.id}> smacked <@${target.id}> across the face! *Ouch, that left a mark!* 💥😵`,
      `<@${user.id}> slapped some common sense back into <@${target.id}>! ✋⚡`,
    ];
    const caption = captions[Math.floor(Math.random() * captions.length)];

    const embed = makeEmbed({
      title: "👋 Dramatic Anime Slap!",
      description: `### ${caption}`,
      level: "ERROR",
      color: 0xe74c3c,
      image: gifUrl,
      footer: formatInteractionFooter(count, "slap"),
    });

    return await ctx.reply({ embeds: [embed] });
  },
});
