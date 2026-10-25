import { SlashCommandBuilder } from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed } from "../../core/embeds.js";
import { getAnimeActionGif } from "./_animeGifs.js";

const slashBuilder = new SlashCommandBuilder()
  .setName("kiss")
  .setDescription("Give someone a sweet and affectionate kiss")
  .addUserOption((opt) =>
    opt.setName("user").setDescription("The person you want to kiss").setRequired(true)
  );

export default createCommand({
  name: "kiss",
  category: "Fun",
  aliases: ["smooch", "muah"],
  description: "Give someone a sweet and affectionate kiss",
  usage: "<@user>",
  examples: ["/kiss user:@Friend", "dv kiss @Friend"],
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
            title: "Kiss Who?",
            description: "Please mention the special someone you'd like to kiss! 💋\n\n**Example:** `dv kiss @Friend`",
            level: "WARNING",
          }),
        ],
        ephemeral: true,
      });
    }

    const gifUrl = await getAnimeActionGif("kiss");

    // Self-kiss
    if (target.id === user.id) {
      const embed = makeEmbed({
        title: "💋 Mirror Smooch!",
        description: `<@${user.id}> kissed their own reflection in the mirror... gotta love yourself! ✨💖`,
        level: "PREMIUM",
        color: 0xff69b4,
        image: gifUrl,
        footer: "Self-love is important!",
      });
      return await ctx.reply({ embeds: [embed] });
    }

    // Bot-kiss
    if (target.id === client.user.id) {
      const embed = makeEmbed({
        title: "🤖 Aww, Thank You!",
        description: `*Beep boop!* <@${user.id}> gave me a sweet kiss! *blushes in binary* 🤖💕`,
        level: "PREMIUM",
        color: 0xff69b4,
        image: gifUrl,
        footer: "Digital Vigital Affection Module",
      });
      return await ctx.reply({ embeds: [embed] });
    }

    // Standard user-to-user kiss
    const captions = [
      `<@${user.id}> passionately kissed <@${target.id}>! 💋`,
      `<@${user.id}> pulled <@${target.id}> close and gave them a sweet kiss! 💕`,
      `<@${user.id}> planted a tender kiss on <@${target.id}>'s cheek! ✨`,
      `<@${user.id}> surprised <@${target.id}> with a romantic smooch! 💖`,
    ];
    const caption = captions[Math.floor(Math.random() * captions.length)];

    const embed = makeEmbed({
      title: "💋 Sweet Kiss!",
      description: `### ${caption}`,
      level: "PREMIUM",
      color: 0xff69b4,
      image: gifUrl,
      footer: "Mwah! Sending warmth and love.",
    });

    return await ctx.reply({ embeds: [embed] });
  },
});
