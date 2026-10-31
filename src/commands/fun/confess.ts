import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  ModalBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
  TextInputBuilder,
  TextInputStyle,
  type TextChannel,
} from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed } from "../../core/embeds.js";
import { EMOJIS } from "../../core/emojis.js";
import {
  getConfessionConfig,
  checkUserCooldown,
} from "../../db/helpers/confessions.js";

const slashBuilder = new SlashCommandBuilder()
  .setName("confess")
  .setDescription("Submit an anonymous confession to the server.");

export default createCommand({
  name: "confess",
  description: "Submit an anonymous confession to the server.",
  category: "Fun",
  aliases: ["confession"],
  usage: "",
  examples: ["/confess"],
  slashBuilder,

  async execute(ctx) {
    const { guild, user, member, interaction, isInteraction } = ctx;
    if (!guild) {
      return await ctx.reply("This command can only be used inside a server.");
    }

    const config = await getConfessionConfig(guild.id);

    // Optional admin prefix fallback: !confess panel
    if (!isInteraction && ctx.options._args?.[0] === "panel") {
      const isOwner = member?.id === guild.ownerId;
      const isAdmin =
        member?.permissions?.has(PermissionFlagsBits.Administrator) ||
        member?.permissions?.has(PermissionFlagsBits.ManageGuild);

      if (!isOwner && !isAdmin) {
        return await ctx.reply({
          content: "❌ You need Administrator or Manage Server permissions to deploy the confession panel.",
          flags: MessageFlags.Ephemeral,
        });
      }

      if (!config || !config.channel_id) {
        return await ctx.reply({
          content: "❌ Please configure the public confession channel in the dashboard first.",
          flags: MessageFlags.Ephemeral,
        });
      }

      const targetChannel = (await guild.channels.fetch(config.channel_id).catch(() => null)) as TextChannel | null;
      if (!targetChannel || !targetChannel.isTextBased()) {
        return await ctx.reply({
          content: "❌ Configured confession channel is invalid or inaccessible.",
          flags: MessageFlags.Ephemeral,
        });
      }

      const heartEmoji = EMOJIS.get("heart") || "💌";
      const panelEmbed = makeEmbed({
        title: `${heartEmoji} Server Confessions Box`,
        description:
          `Have something on your mind that you want to share with the server anonymously?\n\n` +
          `• Click the button below to open the confession form.\n` +
          `• Your identity is protected and kept completely anonymous.\n` +
          `• Submissions must respect server community guidelines.\n\n` +
          `*All confessions are screened according to server safety standards.*`,
        color: "#EC4899",
        footer: `${guild.name} • Anonymous Confessions`,
      });

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId("confess_open_modal")
          .setLabel("Submit Anonymous Confession")
          .setStyle(ButtonStyle.Primary)
          .setEmoji("💌")
      );

      await targetChannel.send({
        embeds: [panelEmbed],
        components: [row],
      });

      return await ctx.reply({
        content: `✅ Confession submission panel successfully posted to <#${config.channel_id}>!`,
        flags: MessageFlags.Ephemeral,
      });
    }

    if (!config || !config.enabled) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Confessions Inactive",
            description: `${EMOJIS.get("warning") || "⚠️"} Confessions are currently disabled in this server. Please ask an admin to enable them in the dashboard.`,
            level: "WARNING",
          }),
        ],
        flags: MessageFlags.Ephemeral,
      });
    }

    if (!config.channel_id) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Confessions Not Configured",
            description: `${EMOJIS.get("warning") || "⚠️"} A confession channel has not been configured yet. Please ask an admin to configure the confession channel in the dashboard.`,
            level: "WARNING",
          }),
        ],
        flags: MessageFlags.Ephemeral,
      });
    }

    if (ctx.channel?.id !== config.channel_id) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Channel Restricted",
            description: `❌ The \`/confess\` command can only be used in <#${config.channel_id}>.`,
            level: "WARNING",
          }),
        ],
        flags: MessageFlags.Ephemeral,
      });
    }

    // Cooldown verification (non-consuming)
    const cooldownRemaining = checkUserCooldown(guild.id, user.id, config.cooldown_seconds);
    if (cooldownRemaining > 0) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Slow Down!",
            description: `${EMOJIS.get("warning") || "⏳"} Please wait **${cooldownRemaining}s** before submitting another confession.`,
            level: "WARNING",
          }),
        ],
        flags: MessageFlags.Ephemeral,
      });
    }

    // If invoked via slash command or interaction, show modal directly
    if (isInteraction && interaction) {
      const modal = new ModalBuilder()
        .setCustomId("confess_modal_submit")
        .setTitle("Submit Anonymous Confession");

      const contentInput = new TextInputBuilder()
        .setCustomId("confession_content")
        .setLabel("Your Confession")
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder("Type your honest thoughts here... (Keep it safe and respectful)")
        .setMinLength(5)
        .setMaxLength(2000)
        .setRequired(true);

      const imageInput = new TextInputBuilder()
        .setCustomId("confession_image")
        .setLabel("Optional Image URL")
        .setStyle(TextInputStyle.Short)
        .setPlaceholder("https://example.com/image.png (Optional)")
        .setRequired(false);

      modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(contentInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(imageInput)
      );

      return await interaction.showModal(modal);
    }

    // Fallback for prefix message invocation: provide interactive button to open modal
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("confess_open_modal")
        .setLabel("Submit Anonymous Confession")
        .setStyle(ButtonStyle.Primary)
        .setEmoji("💌")
    );

    return await ctx.reply({
      content: "Click the button below to submit your anonymous confession:",
      components: [row],
      flags: MessageFlags.Ephemeral,
    });
  },
});
