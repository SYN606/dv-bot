import { SlashCommandBuilder } from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed } from "../../core/embeds.js";
import { setAfkStatus } from "../../db/helpers/afk.js";

const slashBuilder = new SlashCommandBuilder()
  .setName("afk")
  .setDescription("Set your Away-From-Keyboard status for this server")
  .addStringOption((opt) => opt.setName("reason").setDescription("Why are you going AFK?").setRequired(false));

export default createCommand({
  name: "afk",
  description: "Set your Away-From-Keyboard status for this server",
  category: "Utility",
  slashBuilder,

  async execute(ctx) {
    if (!ctx.guild) {
      return await ctx.reply({
        content: "The AFK command can only be used inside a server.",
        ephemeral: true,
      });
    }

    const reason = ctx.options.reason || ctx.options.raw || "AFK";

    let originalNick = ctx.member?.nickname || null;
    if (
      ctx.member &&
      ctx.guild?.members?.me?.permissions?.has("ManageNicknames") &&
      !ctx.member.permissions.has("Administrator")
    ) {
      const newNick = `[AFK] ${ctx.member.displayName}`.slice(0, 32);
      await ctx.member.setNickname(newNick).catch(() => {});
    }

    await setAfkStatus(ctx.user.id, ctx.guild.id, reason, originalNick);

    const avatar = ctx.user.displayAvatarURL({ dynamic: true, size: 256 });
    const embed = makeEmbed({
      author: {
        name: "Away From Keyboard",
        iconURL: avatar,
      },
      title: `${ctx.user.username} is now AFK`,
      description:
        `• **Reason:** \`${reason}\`\n\n` +
        `-# Sending a message in this server will clear your AFK status and show any mentions you received.`,
      thumbnail: avatar,
      level: "SUCCESS",
      headerDivider: false,
    });

    return await ctx.reply({ embeds: [embed] });
  },
});
