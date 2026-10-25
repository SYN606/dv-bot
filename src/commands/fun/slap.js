import { SlashCommandBuilder } from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed } from "../../core/embeds.js";
import { getAnimeActionGif } from "./_animeGifs.js";

const slashBuilder = new SlashCommandBuilder()
  .setName("slap")
  .setDescription("Dramatically slap someone across the face (anime style)")
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
            title: "Slap Who?",
            description: "Please mention the user who deserves a dramatic anime slap! 👋\n\n**Example:** `dv slap @Friend`",
            level: "WARNING",
          }),
        ],
        ephemeral: true,
      });
    }

    const gifUrl = await getAnimeActionGif("slap");

    if (target.id === user.id) {
      const embed = makeEmbed({
        title: "😵 Self-Facepalm!",
        description: `<@${user.id}> slapped themselves awake! *Ouch... snap back to reality!* 🖐️💥`,
        level: "WARNING",
        color: 0xfee75c,
        image: gifUrl,
        footer: "Don't be too hard on yourself!",
      });
      return await ctx.reply({ embeds: [embed] });
    }

    const captions = [
      `<@${user.id}> delivered a thunderous anime slap to <@${target.id}>! 🖐️💥`,
      `<@${user.id}> smacked <@${target.id}> across the face! *B-Baka!* 💢`,
      `*SLAP!* <@${user.id}> struck <@${target.id}> with the force of 1,000 anime betrayals! ⚡`,
    ];
    const caption = captions[Math.floor(Math.random() * captions.length)];

    const embed = makeEmbed({
      title: "🖐️ Anime Slap!",
      description: `### ${caption}`,
      level: "ERROR",
      color: 0xeb4d4b,
      image: gifUrl,
      footer: "Oof! That looked like it stung.",
    });

    return await ctx.reply({ embeds: [embed] });
  },
});
