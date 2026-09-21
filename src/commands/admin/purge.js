import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed } from "../../core/embeds.js";
import { EMOJIS } from "../../core/emojis.js";

const slashBuilder = new SlashCommandBuilder()
  .setName("purge")
  .setDescription("Bulk delete messages from the current channel")
  .addIntegerOption((opt) =>
    opt
      .setName("amount")
      .setDescription("Number of messages to delete (1-100)")
      .setRequired(true)
      .setMinValue(1)
      .setMaxValue(100)
  )
  .addUserOption((opt) => opt.setName("user").setDescription("Filter messages by specific user").setRequired(false));

export default createCommand({
  name: "purge",
  description: "Bulk delete messages from the current channel",
  category: "Admin",
  modOnly: true,
  requiredPermission: PermissionFlagsBits.ManageMessages,
  slashBuilder,

  async execute(ctx) {
    const { channel, options } = ctx;
    if (!channel || !channel.bulkDelete) {
      return await ctx.reply({ content: "Cannot purge messages in this channel type.", ephemeral: true });
    }

    const amount = Number(options.amount || options._args?.[0]) || 10;
    const targetUser = options.user ? ctx.guild.members.cache.get(options.user)?.user : null;

    await ctx.defer({ ephemeral: true });

    let messages = await channel.messages.fetch({ limit: Math.min(amount + (ctx.isInteraction ? 0 : 1), 100) });

    if (targetUser) {
      messages = messages.filter((m) => m.author.id === targetUser.id);
    }

    const deleted = await channel.bulkDelete(messages, true).catch(() => null);
    const count = deleted ? deleted.size : 0;

    return await ctx.reply({
      embeds: [
        makeEmbed({
          title: "Messages Purged",
          description: `${EMOJIS.get("success") || "✅"} Successfully deleted **${count}** messages.`,
          level: "SUCCESS",
        }),
      ],
      ephemeral: true,
    });
  },
});
