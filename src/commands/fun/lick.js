import { SlashCommandBuilder } from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed } from "../../core/embeds.js";
import { getAnimeActionGif } from "./_animeGifs.js";

const slashBuilder = new SlashCommandBuilder()
  .setName("lick")
  .setDescription("Playfully lick another user")
  .addUserOption((opt) =>
    opt.setName("user").setDescription("The person you want to lick").setRequired(true)
  );

export default createCommand({
  name: "lick",
  category: "Fun",
  aliases: ["slurp", "taste"],
  description: "Playfully lick another user",
  usage: "<@user>",
  examples: ["/lick user:@Friend", "dv lick @Friend"],
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
            title: "Lick Who?",
            description: "Please mention the user you want to playfully lick! 👅\n\n**Example:** `dv lick @Friend`",
            level: "WARNING",
          }),
        ],
        ephemeral: true,
      });
    }

    const gifUrl = await getAnimeActionGif("lick");

    // Self-lick
    if (target.id === user.id) {
      const embed = makeEmbed({
        title: "🐱 Self-Lick!",
        description: `<@${user.id}> licked their own arm... what did that taste like? 🐾`,
        level: "PREMIUM",
        color: 0x9b59b6,
        image: gifUrl,
        footer: "Channeling your inner anime cat!",
      });
      return await ctx.reply({ embeds: [embed] });
    }

    // Bot-lick
    if (target.id === client.user.id) {
      const embed = makeEmbed({
        title: "⚡ Static Shock!",
        description: `Hey <@${user.id}>! Don't lick the bot's circuits, you might get a static zap! ⚡🤖`,
        level: "WARNING",
        color: 0xfee75c,
        image: gifUrl,
        footer: "Danger: 5V USB current detected",
      });
      return await ctx.reply({ embeds: [embed] });
    }

    // Standard user-to-user lick
    const captions = [
      `<@${user.id}> playfully licked <@${target.id}>! 👅 *slurp*`,
      `<@${user.id}> gave <@${target.id}> a cheeky anime lick! 🐱✨`,
      `<@${user.id}> tastes <@${target.id}>... mmm, sweet! 🍭`,
      `<@${user.id}> sneaks up and licks <@${target.id}>'s cheek! 🐾`,
    ];
    const caption = captions[Math.floor(Math.random() * captions.length)];

    const embed = makeEmbed({
      title: "👅 Playful Lick!",
      description: `### ${caption}`,
      level: "PREMIUM",
      color: 0x9b59b6,
      image: gifUrl,
      footer: "Slurp! Playful vibes only.",
    });

    return await ctx.reply({ embeds: [embed] });
  },
});
