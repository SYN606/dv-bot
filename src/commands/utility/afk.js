import { SlashCommandBuilder } from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed } from "../../core/embeds.js";
import { EMOJIS } from "../../core/emojis.js";
import { setAfkStatus } from "../../db/helpers/afk.js";

const slashBuilder = new SlashCommandBuilder()
  .setName("afk")
  .setDescription("Set your Away-From-Keyboard status")
  .addStringOption((opt) => opt.setName("reason").setDescription("Why are you going AFK?").setRequired(false))
  .addBooleanOption((opt) => opt.setName("global").setDescription("Set AFK across all servers").setRequired(false));

export default createCommand({
  name: "afk",
  description: "Set your Away-From-Keyboard status",
  category: "Utility",
  slashBuilder,

  async execute(ctx) {
    const reason = ctx.options.reason || ctx.options.raw || "AFK";
    const isGlobal = ctx.options.global || false;

    let originalNick = ctx.member?.nickname || null;
    if (ctx.member && ctx.guild?.members.me?.permissions.has("ManageNicknames") && !ctx.member.permissions.has("Administrator")) {
      const newNick = `[AFK] ${ctx.member.displayName}`.slice(0, 32);
      await ctx.member.setNickname(newNick).catch(() => {});
    }

    await setAfkStatus(ctx.user.id, ctx.guild?.id, reason, isGlobal, originalNick);

    const avatar = ctx.user.displayAvatarURL({ dynamic: true, size: 256 });
    const embed = makeEmbed({
      author: {
        name: "Away From Keyboard",
        iconURL: avatar,
      },
      title: `${ctx.user.username} is now AFK`,
      description:
        `• **Reason:** \`${reason}\`\n` +
        `• **Scope:** \`${isGlobal ? "Global (All Servers)" : "Server Only"}\`\n\n` +
        `-# Sending a message will automatically clear your AFK status.`,
      thumbnail: avatar,
      level: "SUCCESS",
      headerDivider: false,
    });

    return await ctx.reply({ embeds: [embed] });
  },
});
