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
  .setName("kiss")
  .setDescription("Give someone a sweet and affectionate anime kiss")
  .setDMPermission(false)
  .addUserOption((opt) =>
    opt.setName("user").setDescription("The special someone you want to kiss").setRequired(true)
  );

export default createCommand({
  name: "kiss",
  category: "Fun",
  aliases: ["smooch", "muah"],
  description: "Give someone a sweet and affectionate anime kiss",
  usage: "<@user>",
  examples: ["/kiss user:@Friend", "dv kiss @Friend"],
  slashBuilder,

  async execute(ctx) {
    const { user, guild } = ctx;

    const target = await resolveTargetUser(ctx);

    if (!target) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Kiss Who?",
            description: "Please mention the special someone you'd like to kiss! 💋\n\n**Example:** `dv kiss @Friend` or `/kiss user:@Friend`",
            level: "WARNING",
          }),
        ],
        ephemeral: true,
      });
    }

    await ctx.defer({ ephemeral: false });

    const gifUrl = await getAnimeActionGif("kiss");

    if (target.id === user.id) {
      const embed = makeEmbed({
        title: "🪞 Self-Love!",
        description: `<@${user.id}> kissed their own reflection in the mirror! *Looking fabulous today!* 💋✨`,
        level: "PREMIUM",
        color: 0xeb459e,
        image: gifUrl,
        footer: "Nothing wrong with some healthy self-confidence! 💅",
      });
      return await ctx.reply({ embeds: [embed] });
    }

    const { count } = getAndIncrementInteraction(guild?.id, user.id, target.id, "kiss");

    const captions = [
      `<@${user.id}> gently pulled <@${target.id}> in for a sweet, passionate kiss! 💋✨`,
      `*Mwah!* <@${user.id}> planted a loving kiss on <@${target.id}>'s cheek! 🌸💕`,
      `<@${user.id}> gave <@${target.id}> a magical anime kiss under the stars! 🌙💖`,
      `<@${user.id}> leaned in and gave <@${target.id}> an affectionate smooch! 🥺💗`,
    ];
    const caption = captions[Math.floor(Math.random() * captions.length)];

    const embed = makeEmbed({
      title: "💋 Anime Kiss!",
      description: `### ${caption}`,
      level: "PREMIUM",
      color: 0xeb459e,
      image: gifUrl,
      footer: formatInteractionFooter(count, "kiss"),
    });

    return await ctx.reply({ embeds: [embed] });
  },
});
