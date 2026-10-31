import {
  ActionRowBuilder,
  MessageFlags,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  type ButtonInteraction,
  type ModalSubmitInteraction,
} from "discord.js";
import { makeEmbed } from "../core/embeds.js";
import { EMOJIS } from "../core/emojis.js";
import {
  getConfessionConfig,
  getConfessionByNumber,
  createConfession,
  checkWordFilter,
  checkUserCooldown,
  updateConfessionStatus,
} from "../db/helpers/confessions.js";
import {
  canMemberReviewConfession,
  postPublicConfession,
  sendReviewConfession,
} from "../services/confessionService.js";
import { logger } from "../utils/logger.js";

export function registerConfessionComponents(client: any) {
  // 1. Open Confession Submission Modal
  client.components.set("confess_open_modal", async (interaction: ButtonInteraction) => {
    const guild = interaction.guild;
    if (!guild) return;

    const config = await getConfessionConfig(guild.id);
    if (!config || !config.enabled) {
      return await interaction.reply({
        embeds: [
          makeEmbed({
            title: "Confessions Inactive",
            description: `${EMOJIS.get("warning") || "⚠️"} The confession system is currently inactive in this server.`,
            level: "WARNING",
          }),
        ],
        flags: MessageFlags.Ephemeral,
      });
    }

    const modal = new ModalBuilder()
      .setCustomId("confess_modal_submit")
      .setTitle("Submit Anonymous Confession");

    const contentInput = new TextInputBuilder()
      .setCustomId("confession_content")
      .setLabel("Your Confession")
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder("Type your honest thoughts here... (Keep it safe and respectful)")
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
      .setPlaceholder("yes")
      .setValue("yes")
      .setRequired(false);

    modal.addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(contentInput),
      new ActionRowBuilder<TextInputBuilder>().addComponents(imageInput),
      new ActionRowBuilder<TextInputBuilder>().addComponents(anonymousInput)
    );

    await interaction.showModal(modal);
  });

  // 2. Handle Confession Modal Submission
  client.components.set("confess_modal_submit", async (interaction: ModalSubmitInteraction) => {
    const guild = interaction.guild;
    if (!guild) return;

    const config = await getConfessionConfig(guild.id);
    if (!config || !config.enabled) {
      return await interaction.reply({
        content: "Confessions are currently disabled in this server.",
        flags: MessageFlags.Ephemeral,
      });
    }

    const content = interaction.fields.getTextInputValue("confession_content")?.trim();
    const rawImage = interaction.fields.getTextInputValue("confession_image")?.trim();
    const rawAnon = interaction.fields.getTextInputValue("confession_anonymous")?.trim().toLowerCase();
    const isAnonymous = config.allow_anonymous ? rawAnon !== "no" : false;

    // Cooldown verification
    const cooldownRemaining = checkUserCooldown(guild.id, interaction.user.id, config.cooldown_seconds);
    if (cooldownRemaining > 0) {
      return await interaction.reply({
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

    // Word & Regex Filter
    const filterResult = checkWordFilter(content, config);
    if (filterResult.flagged) {
      return await interaction.reply({
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

    let imageUrl: string | null = null;
    if (rawImage && /^https?:\/\/.+\.(png|jpg|jpeg|gif|webp)(\?.*)?$/i.test(rawImage)) {
      imageUrl = rawImage;
    }

    try {
      const confession = await createConfession({
        guildId: guild.id,
        userId: interaction.user.id,
        userTag: interaction.user.tag || interaction.user.username,
        content,
        imageUrl,
        isAnonymous,
      });

      const heartEmoji = EMOJIS.get("heart") || "💌";

      if (config.require_approval && config.review_channel_id) {
        // Send to staff review queue
        await sendReviewConfession(client, guild, confession, config);

        return await interaction.reply({
          embeds: [
            makeEmbed({
              title: `${heartEmoji} Confession Received!`,
              description:
                `Your confession has been routed to the staff review queue as **#${confession.confession_number}**.\n\n` +
                `Once approved by a moderator, it will be posted automatically to <#${config.channel_id}>.`,
              level: "SUCCESS",
            }),
          ],
          flags: MessageFlags.Ephemeral,
        });
      }

      // Direct post to public confession channel
      await postPublicConfession(client, guild, confession, config);

      return await interaction.reply({
        embeds: [
          makeEmbed({
            title: `${heartEmoji} Confession Published!`,
            description: `Your confession was published successfully as **Confession #${confession.confession_number}** in <#${config.channel_id}>!`,
            level: "SUCCESS",
          }),
        ],
        flags: MessageFlags.Ephemeral,
      });
    } catch (err: any) {
      logger.error("[CONFESSION SUBMISSION ERROR]:", err);
      return await interaction.reply({
        content: `Error processing confession: ${err.message}`,
        flags: MessageFlags.Ephemeral,
      });
    }
  });

  // 3. Handle Staff Review: Approve
  client.components.set("confess_approve", async (interaction: ButtonInteraction) => {
    const guild = interaction.guild;
    const member = interaction.member;
    if (!guild || !member) return;

    const confessionNumber = Number(interaction.customId.split(":")[1]);
    const config = await getConfessionConfig(guild.id);

    // Permission Verification: Must be Admin or hold configured reviewer role
    if (!canMemberReviewConfession(member, config)) {
      return await interaction.reply({
        content: "❌ You do not have an authorized staff role to review confessions.",
        flags: MessageFlags.Ephemeral,
      });
    }

    const confession = await getConfessionByNumber(guild.id, confessionNumber);
    if (!confession) {
      return await interaction.reply({
        content: "Could not find this confession in the database.",
        flags: MessageFlags.Ephemeral,
      });
    }

    if (confession.status === "approved") {
      return await interaction.reply({
        content: "This confession has already been approved and published.",
        flags: MessageFlags.Ephemeral,
      });
    }

    await interaction.deferUpdate();

    try {
      // Publish to public channel
      await postPublicConfession(client, guild, confession, config);

      // Record reviewer
      await updateConfessionStatus(guild.id, confessionNumber, {
        status: "approved",
        reviewed_by: interaction.user.id,
        reviewed_by_tag: interaction.user.tag || interaction.user.username,
      });

      // Update the review message in the staff channel
      const successEmoji = EMOJIS.get("success") || "✅";
      const updatedEmbed = makeEmbed({
        title: `Confession #${confessionNumber} • Approved`,
        description:
          `> ${confession.content.split("\n").join("\n> ")}\n\n` +
          `**Reviewed By:** <@${interaction.user.id}> (\`${interaction.user.tag || interaction.user.username}\`)\n` +
          (config.show_author_in_review ? `**Author:** <@${confession.user_id}> (\`${confession.user_tag}\`)\n` : "") +
          `**Status:** ${successEmoji} Approved & Published to <#${config.channel_id}>`,
        color: "#10B981", // Emerald success
        footer: `Confession #${confessionNumber} • Reviewed`,
      });

      await interaction.message.edit({
        embeds: [updatedEmbed],
        components: [], // Remove action buttons once completed
      });
    } catch (err: any) {
      logger.error("[CONFESSION APPROVAL ERROR]:", err);
      await interaction.followUp({
        content: `Error publishing confession: ${err.message}`,
        flags: MessageFlags.Ephemeral,
      });
    }
  });

  // 4. Handle Staff Review: Reject (Opens Rejection Reason Modal)
  client.components.set("confess_reject", async (interaction: ButtonInteraction) => {
    const guild = interaction.guild;
    const member = interaction.member;
    if (!guild || !member) return;

    const confessionNumber = Number(interaction.customId.split(":")[1]);
    const config = await getConfessionConfig(guild.id);

    // Permission Verification
    if (!canMemberReviewConfession(member, config)) {
      return await interaction.reply({
        content: "❌ You do not have an authorized staff role to review confessions.",
        flags: MessageFlags.Ephemeral,
      });
    }

    const modal = new ModalBuilder()
      .setCustomId(`confess_reject_modal:${confessionNumber}`)
      .setTitle(`Reject Confession #${confessionNumber}`);

    const reasonInput = new TextInputBuilder()
      .setCustomId("rejection_reason")
      .setLabel("Reason for Rejection")
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder("E.g. Inappropriate language, troll confession, violates rule 3...")
      .setMaxLength(500)
      .setRequired(false);

    modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(reasonInput));
    await interaction.showModal(modal);
  });

  // 5. Handle Rejection Modal Submit
  client.components.set("confess_reject_modal", async (interaction: ModalSubmitInteraction) => {
    const guild = interaction.guild;
    const member = interaction.member;
    if (!guild || !member) return;

    const confessionNumber = Number(interaction.customId.split(":")[1]);
    const reason = interaction.fields.getTextInputValue("rejection_reason")?.trim() || "No reason specified";
    const config = await getConfessionConfig(guild.id);

    const confession = await getConfessionByNumber(guild.id, confessionNumber);
    if (!confession) {
      return await interaction.reply({
        content: "Could not find this confession.",
        flags: MessageFlags.Ephemeral,
      });
    }

    await updateConfessionStatus(guild.id, confessionNumber, {
      status: "rejected",
      rejection_reason: reason,
      reviewed_by: interaction.user.id,
      reviewed_by_tag: interaction.user.tag || interaction.user.username,
    });

    const failEmoji = EMOJIS.get("fail") || "❌";
    const updatedEmbed = makeEmbed({
      title: `Confession #${confessionNumber} • Rejected`,
      description:
        `> ${confession.content.split("\n").join("\n> ")}\n\n` +
        `**Reviewed By:** <@${interaction.user.id}> (\`${interaction.user.tag || interaction.user.username}\`)\n` +
        (config.show_author_in_review ? `**Author:** <@${confession.user_id}> (\`${confession.user_tag}\`)\n` : "") +
        `**Status:** ${failEmoji} Rejected\n` +
        `**Reason:** *${reason}*`,
      color: "#EF4444", // Crimson/Red
      footer: `Confession #${confessionNumber} • Rejected`,
    });

    await interaction.deferUpdate();

    if (confession.review_message_id && config.review_channel_id) {
      try {
        const reviewChannel = await guild.channels.fetch(config.review_channel_id).catch(() => null);
        if (reviewChannel && reviewChannel.isTextBased()) {
          const msg = await reviewChannel.messages.fetch(confession.review_message_id).catch(() => null);
          if (msg) {
            await msg.edit({
              embeds: [updatedEmbed],
              components: [],
            });
          }
        }
      } catch (err: any) {
        logger.warn("[CONFESSION REJECT MSG EDIT ERROR]:", err.message);
      }
    }
  });
}
