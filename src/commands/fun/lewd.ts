import { SlashCommandBuilder } from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed } from "../../core/embeds.js";
import { getAnimeActionGif, getAndIncrementInteraction } from "./_animeGifs.js";

const slashBuilder = new SlashCommandBuilder()
  .setName("lewd")
  .setDescription("Call out someone or the channel for being too lewd (anime trope reaction)")
  .addUserOption((opt) =>
    opt.setName("user").setDescription("The person being too lewd (optional)").setRequired(false)
  );

export default createCommand({
  name: "lewd",
  category: "Fun",
  aliases: ["horny", "pervert", "ecchi"],
  description: "Call out someone or the channel for being too lewd (anime trope reaction)",
  usage: "[@user]",
  examples: [
    "/lewd",
    "/lewd user:@Friend",
    "dv lewd",
    "dv lewd @Friend",
  ],
  slashBuilder,

  async execute(ctx) {
    const { client, message, user, guild } = ctx;

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

    const gifUrl = await getAnimeActionGif("lewd");

    // Self callout
    if (target && target.id === user.id) {
      const embed = makeEmbed({
        title: "🙈 Lewd Thoughts Detected!",
        description: `### <@${user.id}> confesses to having dirty thoughts!\n> *B-Baka! Get your mind out of the gutter!* 😳💦`,
        level: "WARNING",
        color: 0xed4245,
        image: gifUrl,
        footer: "BONK! Self-reported to Horny Jail 🚔",
      });
      return await ctx.reply({ embeds: [embed] });
    }

    // Target callout
    if (target) {
      const { count } = getAndIncrementInteraction(guild?.id, user.id, target.id, "lewd_callout");
      const targetCaptions = [
        `<@${user.id}> caught <@${target.id}> being WAY too LEWD! 😳🚨`,
        `<@${target.id}>, stop being so shameless! <@${user.id}> is reporting you to the anime police! 🚓`,
        `🚨 **CODE RED:** <@${user.id}> spotted <@${target.id}> committing utterly unholy degenerate acts! 🙈`,
        `<@${user.id}> is blushing uncontrollably because <@${target.id}> said something wildly scandalous! 😳💢`,
        `*Gasp!* <@${user.id}> detected illegal levels of down-bad behavior radiating from <@${target.id}>! 🚨`,
      ];
      const caption = targetCaptions[Math.floor(Math.random() * targetCaptions.length)];

      const embed = makeEmbed({
        title: "🚨 THAT'S TOO LEWD!",
        description: `### ${caption}\n\n> *“Open up, Anime Police! Put your hands where we can see them!”* 🚔`,
        level: "WARNING",
        color: 0xed4245,
        image: gifUrl,
        footer: count > 1 ? `Caught being unholy ${count} times now! 🚓` : "Keep it PG-13 in this server!",
      });
      return await ctx.reply({ embeds: [embed] });
    }

    // General chat callout (no target specified)
    const generalCaptions = [
      `<@${user.id}> declared this conversation has become completely LEWD! 🙈🚨`,
      `<@${user.id}> thinks this chat requires immediate holy water and nuclear decontamination! 🧼✨`,
      `Stop it right now! <@${user.id}> cannot handle this level of shamelessness! 😳💦`,
      `🚨 **BONK!** <@${user.id}> is dispatching everyone in this channel straight to Horny Jail! 🚔`,
      `<@${user.id}> is shielding their innocent eyes from this degenerate conversation! 🙈`,
    ];
    const caption = generalCaptions[Math.floor(Math.random() * generalCaptions.length)];

    const embed = makeEmbed({
      title: "🙈 WHOA, TOO LEWD!",
      description: `### ${caption}\n\n> *“B-Baka! Someone please think of the pure anime maidens!”* 😳`,
      level: "WARNING",
      color: 0xed4245,
      image: gifUrl,
      footer: "Emergency Holy Water Dispatched 🧼",
    });

    return await ctx.reply({ embeds: [embed] });
  },
});
