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
  .setName("bonk")
  .setDescription("Bonk someone on the head and send them to horny jail")
  .setDMPermission(false)
  .addUserOption((opt) =>
    opt.setName("user").setDescription("The person you want to bonk").setRequired(true)
  );

export default createCommand({
  name: "bonk",
  category: "Fun",
  aliases: ["hammer"],
  description: "Bonk someone on the head and send them to horny jail",
  usage: "<@user>",
  examples: ["/bonk user:@Friend", "dv bonk @Friend"],
  slashBuilder,

  async execute(ctx) {
    const { user, guild } = ctx;

    const target = await resolveTargetUser(ctx);

    if (!target) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Bonk Who?",
            description: "Please mention someone you'd like to bonk! 🔨\n\n**Example:** `dv bonk @Friend` or `/bonk user:@Friend`",
            level: "WARNING",
          }),
        ],
        ephemeral: true,
      });
    }

    await ctx.defer({ ephemeral: false });

    const gifUrl = await getAnimeActionGif("bonk");

    if (target.id === user.id) {
      const embed = makeEmbed({
        title: "🔨 Self-Bonk!",
        description: `<@${user.id}> bonked themselves on the head to clear their thoughts! *BONK!* 😵💫`,
        level: "WARNING",
        color: 0xffa801,
        image: gifUrl,
        footer: "Straight to horny jail for you!",
      });
      return await ctx.reply({ embeds: [embed] });
    }

    const { count } = getAndIncrementInteraction(guild?.id, user.id, target.id, "bonk");

    const captions = [
      `*BONK!* <@${user.id}> sent <@${target.id}> straight to horny jail! 🔨🚨`,
      `*WHACK!* <@${user.id}> bonked <@${target.id}> on the head with a squeaky hammer! 💢`,
      `<@${user.id}> bonked <@${target.id}>! *No horni allowed in this server!* 🛑⚖️`,
      `*Clang!* <@${user.id}> gave <@${target.id}> a well-deserved bonk! 🤕💫`,
    ];
    const caption = captions[Math.floor(Math.random() * captions.length)];

    const embed = makeEmbed({
      title: "🔨 Anime Bonk!",
      description: `### ${caption}`,
      level: "PREMIUM",
      color: 0xffa801,
      image: gifUrl,
      footer: formatInteractionFooter(count, "bonk"),
    });

    return await ctx.reply({ embeds: [embed] });
  },
});
