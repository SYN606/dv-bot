import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed } from "../../core/embeds.js";
import { EMOJIS } from "../../core/emojis.js";
import {
  getStickyMessage,
  removeStickyMessage,
  setStickyMessage,
} from "../../db/helpers/sticky.js";

const slashBuilder = new SlashCommandBuilder()
  .setName("sticky")
  .setDescription("Manage persistent sticky messages in a channel")
  .addSubcommand((sub) =>
    sub
      .setName("set")
      .setDescription("Set a sticky message for this channel")
      .addStringOption((opt) => opt.setName("message").setDescription("The message content").setRequired(true))
  )
  .addSubcommand((sub) =>
    sub.setName("remove").setDescription("Remove the sticky message from this channel")
  )
  .addSubcommand((sub) =>
    sub.setName("view").setDescription("View current sticky message in this channel")
  );

export default createCommand({
  name: "sticky",
  description: "Manage persistent sticky messages in a channel",
  category: "Admin",
  configOnly: true,
  requiredPermission: PermissionFlagsBits.ManageMessages,
  slashBuilder,

  async execute(ctx) {
    const { guild, channel } = ctx;
    if (!guild || !channel) return;

    const sub = ctx.subcommand || ctx.options._args?.[0] || "view";

    if (sub === "set") {
      const content = ctx.options.message || ctx.options._args?.slice(1).join(" ");
      if (!content) return await ctx.reply("Please provide the sticky message content.");

      await setStickyMessage(guild.id, channel.id, content);

      const embed = makeEmbed({
        title: "Sticky Message Set",
        description: `${EMOJIS.get("success") || "✅"} Sticky notice set for ${channel}:\n\n> ${content}`,
        level: "SUCCESS",
      });

      return await ctx.reply({ embeds: [embed] });
    }

    if (sub === "remove") {
      const deleted = await removeStickyMessage(guild.id, channel.id);
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: deleted ? "Sticky Removed" : "No Sticky Found",
            description: deleted
              ? `${EMOJIS.get("success") || "✅"} Sticky message removed from ${channel}.`
              : `${EMOJIS.get("warning") || "⚠️"} No sticky message was configured in ${channel}.`,
            level: deleted ? "SUCCESS" : "WARNING",
          }),
        ],
      });
    }

    if (sub === "view") {
      const sticky = await getStickyMessage(guild.id, channel.id);
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: `Sticky Notice • #${channel.name}`,
            description: sticky ? `> ${sticky.sticky_content}` : "*No sticky message set in this channel.*",
            level: "INFO",
          }),
        ],
      });
    }
  },
});
