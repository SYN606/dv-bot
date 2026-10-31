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
  getConfessionByNumber,
  listPublicConfessions,
  createConfession,
  checkWordFilter,
  checkUserCooldown,
  recordUserCooldown,
} from "../../db/helpers/confessions.js";
import {
  postPublicConfession,
  sendReviewConfession,
} from "../../services/confessionService.js";

const slashBuilder = new SlashCommandBuilder()
  .setName("confess")
  .setDescription("Submit anonymous confessions, browse recent ones, or configure confession channels.")
  .addSubcommand((sub) =>
    sub
      .setName("submit")
      .setDescription("Submit an anonymous confession to the server.")
      .addStringOption((opt) =>
        opt
          .setName("message")
          .setDescription("Your confession text (leave blank to open interactive modal)")
          .setRequired(false)
      )
      .addBooleanOption((opt) =>
        opt
          .setName("anonymous")
          .setDescription("Keep your name completely anonymous? (Default: true)")
          .setRequired(false)
      )
      .addStringOption((opt) =>
        opt
          .setName("image")
          .setDescription("Optional direct image URL to attach (png/jpg/gif)")
          .setRequired(false)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName("list")
      .setDescription("Browse recent approved confessions in this server.")
      .addIntegerOption((opt) =>
        opt
          .setName("page")
          .setDescription("Page number (default: 1)")
          .setMinValue(1)
          .setRequired(false)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName("view")
      .setDescription("Look up a specific confession by its sequential number.")
      .addIntegerOption((opt) =>
        opt
          .setName("number")
          .setDescription("Confession number (e.g. 42)")
          .setMinValue(1)
          .setRequired(true)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName("panel")
      .setDescription("Post a persistent confession submission button in the confession channel (Admin only).")
  );

export default createCommand({
  name: "confess",
  description: "Submit anonymous confessions, browse previous ones, or deploy the confession panel.",
  category: "Utility",
  aliases: ["confession", "confessions"],
  usage: "<submit|list|view|panel> [options]",
  examples: [
    "/confess submit",
    "/confess submit message:I love coding! anonymous:true",
    "/confess list page:1",
    "/confess view number:12",
    "/confess panel",
  ],
  slashBuilder,

  async execute(ctx) {
    const { guild, user, member, interaction, isInteraction } = ctx;
    if (!guild) {
      return await ctx.reply("This command can only be used inside a server.");
    }

    const subcommand = ctx.subcommand || ctx.options.subcommand || "submit";
    const config = await getConfessionConfig(guild.id);

    // 1. SUBMIT CONFESSION
    if (subcommand === "submit") {
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

      const messageArg = ctx.options.message || ctx.options._args?.join(" ");

      // If no text provided and triggered via slash command, show Discord Modal
      if (!messageArg && isInteraction && interaction) {
        const modal = new ModalBuilder()
          .setCustomId("confess_modal_submit")
          .setTitle("Submit Anonymous Confession");

        const contentInput = new TextInputBuilder()
          .setCustomId("confession_content")
          .setLabel("Your Confession")
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder("Type your confession here...")
          .setMinLength(10)
          .setMaxLength(2000)
          .setRequired(true);

        const imageInput = new TextInputBuilder()
          .setCustomId("confession_image")
          .setLabel("Optional Image URL")
          .setStyle(TextInputStyle.Short)
          .setPlaceholder("https://example.com/image.png (Optional)")
          .setRequired(false);

        const anonymousInput = new TextInputBuilder()
          .setCustomId("confession_anonymous")
          .setLabel("Stay Anonymous? (yes / no)")
          .setStyle(TextInputStyle.Short)
          .setValue("yes")
          .setRequired(false);

        modal.addComponents(
          new ActionRowBuilder<TextInputBuilder>().addComponents(contentInput),
          new ActionRowBuilder<TextInputBuilder>().addComponents(imageInput),
          new ActionRowBuilder<TextInputBuilder>().addComponents(anonymousInput)
        );

        return await interaction.showModal(modal);
      }

      if (!messageArg || messageArg.trim().length < 5) {
        return await ctx.reply({
          content: "Please provide a confession message of at least 5 characters.",
          flags: MessageFlags.Ephemeral,
        });
      }

      if (messageArg.trim().length > 2000) {
        return await ctx.reply({
          content: "Confession content cannot exceed 2000 characters.",
          flags: MessageFlags.Ephemeral,
        });
      }

      // Check cooldown (non-consuming)
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

      // Check word filter
      const filterResult = checkWordFilter(messageArg, config);
      if (filterResult.flagged) {
        return await ctx.reply({
          embeds: [
            makeEmbed({
              title: "Confession Blocked",
              description: `${EMOJIS.get("fail") || "❌"} Your confession could not be submitted because it contains restricted words or prohibited patterns.`,
              level: "ERROR",
            }),
          ],
          flags: MessageFlags.Ephemeral,
        });
      }

      // Sanitize and validate image URL format
      let validatedImageUrl: string | null = null;
      if (ctx.options.image) {
        const rawUrl = String(ctx.options.image).trim();
        if (/^https?:\/\/.+\.(png|jpg|jpeg|gif|webp)(\?.*)?$/i.test(rawUrl)) {
          validatedImageUrl = rawUrl;
        } else {
          return await ctx.reply({
            content: "❌ Provided image must be a valid direct HTTP/HTTPS URL ending in .png, .jpg, .jpeg, .gif, or .webp.",
            flags: MessageFlags.Ephemeral,
          });
        }
      }

      const isAnonymous = ctx.options.anonymous !== undefined ? Boolean(ctx.options.anonymous) : true;

      const confession = await createConfession({
        guildId: guild.id,
        userId: user.id,
        userTag: user.tag || user.username,
        content: messageArg,
        imageUrl: validatedImageUrl,
        isAnonymous: config.allow_anonymous ? isAnonymous : false,
      });

      // Record cooldown only after successful creation
      recordUserCooldown(guild.id, user.id);

      const heartEmoji = EMOJIS.get("heart") || "💌";

      if (config.require_approval && config.review_channel_id) {
        await sendReviewConfession(ctx.client, guild, confession, config);

        return await ctx.reply({
          embeds: [
            makeEmbed({
              title: `${heartEmoji} Confession Submitted for Review`,
              description: `Your confession was recorded as **#${confession.confession_number}** and queued for moderator review. It will be published once approved.`,
              level: "SUCCESS",
            }),
          ],
          flags: MessageFlags.Ephemeral,
        });
      }

      // Direct publish
      await postPublicConfession(ctx.client, guild, confession, config);

      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: `${heartEmoji} Confession Published!`,
            description: `Your confession was published as **#${confession.confession_number}** in <#${config.channel_id}>.`,
            level: "SUCCESS",
          }),
        ],
        flags: MessageFlags.Ephemeral,
      });
    }

    // 2. LIST RECENT CONFESSIONS
    if (subcommand === "list") {
      const page = Math.max(1, Number(ctx.options.page || 1));
      const pageSize = 5;
      const offset = (page - 1) * pageSize;

      const list = await listPublicConfessions(guild.id, pageSize, offset);
      if (!list || list.length === 0) {
        return await ctx.reply({
          embeds: [
            makeEmbed({
              title: "No Confessions Found",
              description: page > 1 ? `No confessions found on page ${page}.` : "No public confessions have been approved yet in this server.",
              level: "INFO",
            }),
          ],
          flags: MessageFlags.Ephemeral,
        });
      }

      const heartEmoji = EMOJIS.get("heart") || "💌";
      let desc = `### ${heartEmoji} Public Confessions Directory (Page ${page})\n\n`;

      for (const item of list) {
        const snippet = item.content.length > 90 ? item.content.slice(0, 87) + "..." : item.content;
        const author = item.is_anonymous ? "*Anonymous*" : `@${item.user_tag}`;
        const dateStr = item.created_at ? new Date(item.created_at).toLocaleDateString() : "Recently";
        desc += `• **#${item.confession_number}** • ${author} (${dateStr})\n  > "${snippet}"\n\n`;
      }

      desc += `💡 *Use \`/confess view number:<id>\` to read full confessions.*`;

      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Server Confessions",
            description: desc,
            color: "#EC4899",
            footer: `Showing confessions ${offset + 1}-${offset + list.length}`,
          }),
        ],
        flags: MessageFlags.Ephemeral,
      });
    }

    // 3. VIEW SPECIFIC CONFESSION
    if (subcommand === "view") {
      const targetNumber = Number(ctx.options.number || ctx.options._args?.[0]);
      if (!targetNumber) {
        return await ctx.reply({ content: "Please specify a valid confession number.", flags: MessageFlags.Ephemeral });
      }

      const confession = await getConfessionByNumber(guild.id, targetNumber);
      if (!confession || confession.status !== "approved") {
        return await ctx.reply({
          embeds: [
            makeEmbed({
              title: "Confession Not Found",
              description: `Could not find an approved confession matching **#${targetNumber}**.`,
              level: "WARNING",
            }),
          ],
          flags: MessageFlags.Ephemeral,
        });
      }

      const heartEmoji = EMOJIS.get("heart") || "💌";
      const embed = makeEmbed({
        title: `${heartEmoji} Confession #${confession.confession_number}`,
        description: confession.content,
        color: "#EC4899",
        footer: `Confession #${confession.confession_number} • ${confession.is_anonymous ? "Anonymous" : confession.user_tag}`,
      });

      if (!confession.is_anonymous) {
        embed.setAuthor({ name: confession.user_tag });
      }

      if (confession.image_url) {
        embed.setImage(confession.image_url);
      }

      return await ctx.reply({
        embeds: [embed],
        flags: MessageFlags.Ephemeral,
      });
    }

    // 4. DEPLOY PERSISTENT SUBMISSION BUTTON PANEL (Admin Only)
    if (subcommand === "panel") {
      const isOwner = member?.id === guild.ownerId;
      const isAdmin = member?.permissions?.has(PermissionFlagsBits.Administrator) || member?.permissions?.has(PermissionFlagsBits.ManageGuild);

      if (!isOwner && !isAdmin) {
        return await ctx.reply({
          content: "❌ You need Administrator or Manage Server permissions to deploy the confession panel.",
          flags: MessageFlags.Ephemeral,
        });
      }

      if (!config.channel_id) {
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

    return await ctx.reply({ content: "Unknown subcommand.", flags: MessageFlags.Ephemeral });
  },
});
