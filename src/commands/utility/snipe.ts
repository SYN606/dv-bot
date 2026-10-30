import { SlashCommandBuilder } from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed, md } from "../../core/embeds.js";
import { EMOJIS } from "../../core/emojis.js";
import { getSnipe } from "../../services/snipeService.js";

const slashBuilder = new SlashCommandBuilder()
  .setName("snipe")
  .setDescription("Show the most recently deleted message in this channel or by a user")
  .addUserOption((opt) =>
    opt
      .setName("user")
      .setDescription("Target user whose last deleted message you want to snipe")
      .setRequired(false)
  );

export default createCommand({
  name: "snipe",
  description: "Show the most recently deleted message in this channel or by a user",
  category: "Utility",
  aliases: ["s"],
  usage: "[@user|userID]",
  examples: [
    "/snipe",
    "/snipe user:@User",
    "dv snipe",
    "dvsnipe",
    "dv snipe @User",
    "dv s",
  ],
  slashBuilder,

  async execute(ctx) {
    const { guild, channel } = ctx;
    if (!guild || !channel) {
      return await ctx.reply({
        content: "The snipe command can only be used inside a server channel.",
        ephemeral: true,
      });
    }

    // Resolve target user if specified via slash option, mention, or argument
    let targetId: string | null = null;
    if (ctx.options?.user) {
      targetId = typeof ctx.options.user === "string" ? ctx.options.user : ctx.options.user.id;
    } else if (ctx.message?.mentions?.users?.first()) {
      targetId = ctx.message.mentions.users.first()!.id;
    } else if (ctx.options?._args && ctx.options._args.length > 0) {
      const match = ctx.options._args[0].match(/\d{17,20}/);
      if (match) targetId = match[0];
    }

    const snipe = getSnipe(channel.id, targetId, guild.id);

    if (!snipe) {
      const emptyNotice = targetId
        ? `No recently deleted messages found for <@${targetId}> in this channel.`
        : "No recently deleted messages found in this channel.";

      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Snipe Empty",
            description: `${EMOJIS.get("fail") || "❌"} ${emptyNotice}`,
            level: "WARNING",
          }),
        ],
        ephemeral: true,
      });
    }

    const sentAt = md.time(snipe.createdAt, "R");
    const deletedAgo = md.time(snipe.deletedAt, "R");

    const embed = makeEmbed({
      author: {
        name: `${snipe.author.displayName} (@${snipe.author.username})`,
        iconURL: snipe.author.avatarUrl || undefined,
      },
      title: "Sniped Deleted Message",
      description: snipe.content || "*[No message text — attachment only]*",
      level: "INFO",
      image: snipe.image || undefined,
      fields: [
        {
          name: "Channel",
          value: `<#${snipe.channelId}>`,
          inline: true,
        },
        {
          name: "Sent",
          value: sentAt,
          inline: true,
        },
        {
          name: "Deleted",
          value: deletedAgo,
          inline: true,
        },
      ],
      footer: {
        text: `Author ID: ${snipe.author.id} • Message ID: ${snipe.id}`,
      },
    });

    // If attachments exist but none was set as the main embed image, list them
    if (snipe.attachments.length > 0 && !snipe.image) {
      const attList = snipe.attachments
        .slice(0, 5)
        .map((a) => `• [${a.name}](${a.url})`)
        .join("\n");
      embed.addFields([{ name: "Attachments", value: attList, inline: false }]);
    }

    return await ctx.reply({
      embeds: [embed],
      allowedMentions: { parse: [] }, // Never ping users/roles through sniped content
    });
  },
});
