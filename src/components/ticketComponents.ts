import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  type ButtonInteraction,
  type StringSelectMenuInteraction,
  type ModalSubmitInteraction,
  type TextChannel,
} from "discord.js";
import { makeEmbed } from "../core/embeds.js";
import { EMOJIS } from "../core/emojis.js";
import {
  getTicketConfig,
  getTicketPanel,
  getTicketById,
  updateTicket,
  submitTicketFeedback,
  unregisterActiveTicketChannel,
} from "../db/helpers/tickets.js";
import {
  openTicketChannel,
  claimTicket,
  closeTicket,
  canMemberManageTickets,
  generateHtmlTranscript,
  createTicketVoiceChannel,
  deleteTicketVoiceChannel,
  activeTicketActions,
  inFlightTicketCreations,
} from "../services/ticketService.js";
import { transitionTicketState } from "../services/ticketLifecycleService.js";
import { logger } from "../utils/logger.js";

async function executeTicketCreation(params: {
  client: any;
  interaction: any;
  guild: any;
  member: any;
  panel: any;
  reasonCategory: any;
  reasonDetails?: string | null;
}) {
  const { client, interaction, guild, member, panel, reasonCategory, reasonDetails } = params;
  const userLockKey = `${guild.id}:${interaction.user.id}`;

  if (inFlightTicketCreations.has(userLockKey)) {
    if (interaction.deferred || interaction.replied) {
      return await interaction.followUp({
        content: "⏳ Please wait, your ticket is currently being generated...",
        flags: MessageFlags.Ephemeral,
      });
    }
    return await interaction.reply({
      content: "⏳ Please wait, your ticket is currently being generated...",
      flags: MessageFlags.Ephemeral,
    });
  }

  inFlightTicketCreations.add(userLockKey);
  const safetyTimeout = setTimeout(() => {
    inFlightTicketCreations.delete(userLockKey);
  }, 15000);
  try {
    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    }

    const { channel } = await openTicketChannel({
      client,
      guild,
      member: member as any,
      panel,
      reasonCategory: reasonCategory || null,
      reasonDetails: reasonDetails || null,
    });

    const categoryText = reasonCategory?.label ? ` **${reasonCategory.label}**` : "";
    return await interaction.editReply({
      content: `✅ Your${categoryText} ticket has been created! Head over to <#${channel.id}>.`,
    });
  } catch (err: any) {
    logger.error("[TICKET OPEN ERROR]:", err);
    return await interaction.editReply({
      content: `❌ Could not create ticket: ${err.message || "Unknown error"}`,
    });
  } finally {
    clearTimeout(safetyTimeout);
    inFlightTicketCreations.delete(userLockKey);
  }
}

export function registerTicketComponents(client: any) {
  // 1. Direct Button Ticket Open (when reason categories are disabled)
  client.components.set("ticket_open_direct", async (interaction: ButtonInteraction) => {
    const guild = interaction.guild;
    const member = interaction.member;
    if (!guild || !member) return;

    const panelId = interaction.customId.split(":")[1];
    const panel = await getTicketPanel(guild.id, panelId);
    if (!panel) {
      return await interaction.reply({
        content: "❌ Ticket panel configuration was not found.",
        flags: MessageFlags.Ephemeral,
      });
    }

    await executeTicketCreation({
      client,
      interaction,
      guild,
      member,
      panel,
      reasonCategory: null,
      reasonDetails: null,
    });
  });

  // 2. Select Menu: Reason Category Chosen
  client.components.set("ticket_select_reason", async (interaction: StringSelectMenuInteraction) => {
    const guild = interaction.guild;
    const member = interaction.member;
    if (!guild || !member) return;

    const panelId = interaction.customId.split(":")[1];
    const selectedCategoryId = interaction.values[0];

    const panel = await getTicketPanel(guild.id, panelId);
    if (!panel) {
      return await interaction.reply({
        content: "❌ Ticket panel configuration was not found.",
        flags: MessageFlags.Ephemeral,
      });
    }

    const reasonCategory = (panel.reason_categories || []).find((c: any) => c.id === selectedCategoryId);
    if (!reasonCategory) {
      return await interaction.reply({
        content: "❌ Selected department or reason category is invalid.",
        flags: MessageFlags.Ephemeral,
      });
    }

    // If reason category requests details/reason from user, show Modal
    if (reasonCategory.require_reason) {
      const modal = new ModalBuilder()
        .setCustomId(`ticket_modal_submit:${panel.id}:${reasonCategory.id}`)
        .setTitle(`${(reasonCategory.label || "Ticket Details").slice(0, 45)}`);

      const reasonInput = new TextInputBuilder()
        .setCustomId("ticket_reason_input")
        .setLabel("Reason / Problem Description")
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder("Please explain your inquiry, issue, or question here...")
        .setMinLength(5)
        .setMaxLength(1000)
        .setRequired(true);

      modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(reasonInput)
      );

      return await interaction.showModal(modal);
    }

    // Otherwise, immediately create the ticket
    await executeTicketCreation({
      client,
      interaction,
      guild,
      member,
      panel,
      reasonCategory,
      reasonDetails: null,
    });
  });

  // 3. Modal Submission with User Reason
  client.components.set("ticket_modal_submit", async (interaction: ModalSubmitInteraction) => {
    const guild = interaction.guild;
    const member = interaction.member;
    if (!guild || !member) return;

    const parts = interaction.customId.split(":");
    const panelId = parts[1];
    const categoryId = parts[2];

    const panel = await getTicketPanel(guild.id, panelId);
    if (!panel) {
      return await interaction.reply({
        content: "❌ Ticket panel configuration was not found.",
        flags: MessageFlags.Ephemeral,
      });
    }

    const reasonCategory = (panel.reason_categories || []).find((c: any) => c.id === categoryId);
    const reasonDetails = interaction.fields.getTextInputValue("ticket_reason_input")?.trim();

    await executeTicketCreation({
      client,
      interaction,
      guild,
      member,
      panel,
      reasonCategory: reasonCategory || null,
      reasonDetails,
    });
  });

  // 4. Claim Ticket
  client.components.set("ticket_claim", async (interaction: ButtonInteraction) => {
    const guild = interaction.guild;
    const member = interaction.member;
    if (!guild || !member) return;

    const ticketId = interaction.customId.split(":")[1];
    const config = await getTicketConfig(guild.id);

    if (!canMemberManageTickets(member, config)) {
      return await interaction.reply({
        content: "❌ You do not have permission to claim support tickets.",
        flags: MessageFlags.Ephemeral,
      });
    }

    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const updated = await claimTicket({
        guild,
        member: member as any,
        ticketId,
      });

      return await interaction.editReply({
        content: `✅ You have successfully claimed ticket **#${updated.ticket_number}**!`,
      });
    } catch (err: any) {
      return await interaction.editReply({
        content: `❌ ${err.message || "Failed to claim ticket."}`,
      });
    }
  });

  // 5. Close Ticket Request (Prompts close modal)
  client.components.set("ticket_close_request", async (interaction: ButtonInteraction) => {
    const guild = interaction.guild;
    const member = interaction.member;
    if (!guild || !member) return;

    const ticketId = interaction.customId.split(":")[1];
    const ticket = await getTicketById(ticketId);
    if (!ticket) {
      return await interaction.reply({
        content: "❌ Ticket record not found.",
        flags: MessageFlags.Ephemeral,
      });
    }

    if (ticket.status === "closed") {
      return await interaction.reply({
        content: "❌ This ticket is already closed.",
        flags: MessageFlags.Ephemeral,
      });
    }

    const config = await getTicketConfig(guild.id);
    const isOpener = ticket.user_id === interaction.user.id;
    const canManage = canMemberManageTickets(member, config);

    if (!isOpener && !canManage) {
      return await interaction.reply({
        content: "❌ You do not have permission to close this ticket.",
        flags: MessageFlags.Ephemeral,
      });
    }

    const modal = new ModalBuilder()
      .setCustomId(`ticket_close_modal:${ticket.id}`)
      .setTitle(`Close Ticket #${ticket.ticket_number}`);

    const reasonInput = new TextInputBuilder()
      .setCustomId("ticket_close_reason")
      .setLabel("Reason for Closing (Optional)")
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("e.g. Issue resolved, user inactivity")
      .setRequired(false)
      .setMaxLength(250);

    modal.addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(reasonInput)
    );

    await interaction.showModal(modal);
  });

  // 6. Close Ticket Modal Submit
  client.components.set("ticket_close_modal", async (interaction: ModalSubmitInteraction) => {
    const guild = interaction.guild;
    const member = interaction.member;
    if (!guild || !member) return;

    const ticketId = interaction.customId.split(":")[1];
    const closeReason = interaction.fields.getTextInputValue("ticket_close_reason")?.trim() || "Resolved";

    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      await closeTicket({
        client,
        guild,
        ticketId,
        closedByMember: member as any,
        reason: closeReason,
      });

      return await interaction.editReply({
        content: "🔒 Ticket has been closed. Archiving transcripts...",
      });
    } catch (err: any) {
      logger.error("[TICKET CLOSE ERROR]:", err);
      return await interaction.editReply({
        content: `❌ Could not close ticket: ${err.message || "Unknown error"}`,
      });
    }
  });

  // 7. Customer Satisfaction Rating Feedback
  client.components.set("ticket_feedback", async (interaction: ButtonInteraction) => {
    const parts = interaction.customId.split(":");
    const ticketId = parts[1];
    const rating = parseInt(parts[2], 10) || 5;

    try {
      const ticket = await getTicketById(ticketId);
      if (!ticket) {
        return await interaction.reply({
          content: "❌ Ticket record not found.",
          flags: MessageFlags.Ephemeral,
        });
      }

      await submitTicketFeedback({
        ticket_id: ticket.id,
        guild_id: ticket.guild_id,
        user_id: interaction.user.id,
        user_tag: interaction.user.tag,
        rating,
      });

      if (interaction.message) {
        await interaction.message.edit({ components: [] }).catch(() => null);
      }

      const stars = "⭐".repeat(rating);
      return await interaction.reply({
        content: `🙏 Thank you for your feedback! You rated this support session **${stars}** (${rating}/5).`,
        flags: MessageFlags.Ephemeral,
      });
    } catch (err: any) {
      return await interaction.reply({
        content: `❌ Failed to save feedback: ${err.message}`,
        flags: MessageFlags.Ephemeral,
      });
    }
  });

  // 8. Delete Ticket Channel Button
  client.components.set("ticket_delete", async (interaction: ButtonInteraction) => {
    const guild = interaction.guild;
    const member = interaction.member;
    const channel = interaction.channel as TextChannel;
    if (!guild || !member || !channel) return;

    const ticketId = interaction.customId.split(":")[1];
    const config = await getTicketConfig(guild.id);

    if (!canMemberManageTickets(member, config)) {
      return await interaction.reply({
        content: "❌ You do not have permission to delete this ticket channel.",
        flags: MessageFlags.Ephemeral,
      });
    }

    const deleteActionKey = `delete:${ticketId}`;
    if (activeTicketActions.has(deleteActionKey)) {
      return await interaction.reply({
        content: "⏳ Deletion is already scheduled for this channel.",
        flags: MessageFlags.Ephemeral,
      });
    }
    activeTicketActions.add(deleteActionKey);

    await interaction.reply({
      content: "🗑️ **Ticket channel will be deleted in 3 seconds...**",
    });

    setTimeout(async () => {
      try {
        const ticket = await getTicketById(ticketId);
        if (ticket && ticket.status !== "closed") {
          await updateTicket(ticketId, {
            status: "closed",
            closed_by: interaction.user.id,
            closed_by_tag: interaction.user.tag,
            close_reason: "Ticket channel deleted by staff",
            closed_at: new Date().toISOString(),
          }).catch(() => null);
        }
        if (ticket?.voice_channel_id) {
          await deleteTicketVoiceChannel({
            guild,
            ticket,
            actor: { id: interaction.user.id, tag: interaction.user.tag },
          }).catch(() => null);
        }
        unregisterActiveTicketChannel(channel.id);
        await channel.delete("Ticket channel deleted by staff").catch(() => null);
      } finally {
        activeTicketActions.delete(deleteActionKey);
      }
    }, 3000);
  });

  // 9. Reopen Ticket Button
  client.components.set("ticket_reopen", async (interaction: ButtonInteraction) => {
    const guild = interaction.guild;
    const member = interaction.member;
    if (!guild || !member) return;

    const ticketId = interaction.customId.split(":")[1];
    const config = await getTicketConfig(guild.id);

    if (!canMemberManageTickets(member, config)) {
      return await interaction.reply({
        content: "❌ You do not have permission to reopen this ticket.",
        flags: MessageFlags.Ephemeral,
      });
    }

    try {
      await transitionTicketState({
        guild,
        ticketId,
        nextStatus: "reopened",
        actor: { id: interaction.user.id, tag: interaction.user.tag },
      });

      if (interaction.message) {
        await interaction.message.edit({ components: [] }).catch(() => null);
      }

      return await interaction.reply({
        content: `🔓 Ticket has been reopened by <@${interaction.user.id}>.`,
      });
    } catch (err: any) {
      return await interaction.reply({
        content: `❌ Failed to reopen ticket: ${err.message}`,
        flags: MessageFlags.Ephemeral,
      });
    }
  });

  // 10. Generate Transcript Button
  client.components.set("ticket_transcript", async (interaction: ButtonInteraction) => {
    const guild = interaction.guild;
    const member = interaction.member;
    const channel = interaction.channel as TextChannel;
    if (!guild || !member || !channel) return;

    const ticketId = interaction.customId.split(":")[1];
    const ticket = await getTicketById(ticketId);
    if (!ticket) {
      return await interaction.reply({
        content: "❌ Ticket record not found.",
        flags: MessageFlags.Ephemeral,
      });
    }

    const config = await getTicketConfig(guild.id);
    if (!canMemberManageTickets(member, config) && ticket.user_id !== interaction.user.id) {
      return await interaction.reply({
        content: "❌ You do not have permission to export this transcript.",
        flags: MessageFlags.Ephemeral,
      });
    }

    await interaction.deferReply();
    const html = await generateHtmlTranscript(channel, ticket);
    const attachment = new AttachmentBuilder(Buffer.from(html, "utf-8"), {
      name: `transcript-ticket-${ticket.ticket_number}.html`,
    });

    return await interaction.editReply({
      content: `📄 HTML chat transcript for Ticket #${ticket.ticket_number}:`,
      files: [attachment],
    });
  });

  // 11. Create Ticket Voice Channel Button
  client.components.set("ticket_create_vc", async (interaction: ButtonInteraction) => {
    const guild = interaction.guild;
    const member = interaction.member;
    if (!guild || !member) return;

    const ticketId = interaction.customId.split(":")[1];
    const ticket = await getTicketById(ticketId);
    if (!ticket) {
      return await interaction.reply({
        content: "❌ Ticket record not found.",
        flags: MessageFlags.Ephemeral,
      });
    }

    if (ticket.status === "closed") {
      return await interaction.reply({
        content: "❌ This ticket is closed. Voice channels cannot be created.",
        flags: MessageFlags.Ephemeral,
      });
    }

    const config = await getTicketConfig(guild.id);
    const isOpener = ticket.user_id === interaction.user.id;
    const canManage = canMemberManageTickets(member, config);

    // Only ticket creator or ticket helpers/staff can create the VC
    if (!isOpener && !canManage) {
      return await interaction.reply({
        content: "❌ Only the ticket creator or ticket helpers can create a voice channel for this ticket.",
        flags: MessageFlags.Ephemeral,
      });
    }

    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const { voiceChannel, alreadyExists } = await createTicketVoiceChannel({
        client,
        guild,
        member: member as any,
        ticket,
      });

      const joinUrl = `https://discord.com/channels/${guild.id}/${voiceChannel.id}`;
      const vcControlRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setLabel("Join Voice Channel")
          .setStyle(ButtonStyle.Link)
          .setURL(joinUrl)
          .setEmoji("🔊"),
        new ButtonBuilder()
          .setCustomId(`ticket_delete_vc:${ticket.id}`)
          .setLabel("End Voice Call")
          .setStyle(ButtonStyle.Danger)
          .setEmoji("🔇")
      );

      if (alreadyExists) {
        return await interaction.editReply({
          content: `🔊 A private voice channel is already active for this ticket: <#${voiceChannel.id}>`,
          components: [vcControlRow],
        });
      }

      // Announce in the ticket text channel
      const textChannel = interaction.channel as TextChannel;
      if (textChannel && textChannel.isTextBased()) {
        const announceEmbed = makeEmbed({
          title: "🎙️ Private Ticket Voice Consultation Active",
          description:
            `A dedicated private voice channel has been created for **Ticket #${ticket.ticket_number}**.\n\n` +
            `🔊 **Voice Channel:** <#${voiceChannel.id}>\n` +
            `🔒 **Access Restricted:** Only the ticket creator (<@${ticket.user_id}>) and assigned ticket helpers have access to view and join this channel.\n\n` +
            `*Click below to join. When your call is finished, either the ticket creator or staff can end the call.*`,
          level: "SUCCESS",
          color: "#10B981",
        });

        await textChannel.send({
          content: `<@${ticket.user_id}> 🎙️ Voice channel is ready!`,
          embeds: [announceEmbed],
          components: [vcControlRow],
        }).catch(() => null);
      }

      return await interaction.editReply({
        content: `✅ Voice channel created! Click <#${voiceChannel.id}> to join.`,
      });
    } catch (err: any) {
      logger.error("[TICKET CREATE VC ERROR]:", err);
      return await interaction.editReply({
        content: `❌ Could not create voice channel: ${err.message || "Unknown error"}`,
      });
    }
  });

  // 12. Delete / End Ticket Voice Channel Button
  client.components.set("ticket_delete_vc", async (interaction: ButtonInteraction) => {
    const guild = interaction.guild;
    const member = interaction.member;
    if (!guild || !member) return;

    const ticketId = interaction.customId.split(":")[1];
    const ticket = await getTicketById(ticketId);
    if (!ticket) {
      return await interaction.reply({
        content: "❌ Ticket record not found.",
        flags: MessageFlags.Ephemeral,
      });
    }

    const config = await getTicketConfig(guild.id);
    const isOpener = ticket.user_id === interaction.user.id;
    const canManage = canMemberManageTickets(member, config);

    if (!isOpener && !canManage) {
      return await interaction.reply({
        content: "❌ Only the ticket creator or ticket helpers can end the voice channel.",
        flags: MessageFlags.Ephemeral,
      });
    }

    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      // Immediately strip the buttons from the interaction message
      if (interaction.message) {
        await interaction.message.edit({ components: [] }).catch(() => null);
      }

      const deleted = await deleteTicketVoiceChannel({
        guild,
        ticket,
        actor: { id: interaction.user.id, tag: interaction.user.tag },
      });

      if (!deleted) {
        return await interaction.editReply({
          content: "ℹ️ There is no active voice channel for this ticket.",
        });
      }

      const textChannel = interaction.channel as TextChannel;
      if (textChannel && textChannel.isTextBased()) {
        await textChannel.send({
          content: `🔇 Private voice channel was closed by <@${interaction.user.id}>.`,
        }).catch(() => null);
      }

      return await interaction.editReply({
        content: "✅ Voice channel has been deleted.",
      });
    } catch (err: any) {
      return await interaction.editReply({
        content: `❌ Could not delete voice channel: ${err.message}`,
      });
    }
  });
}
