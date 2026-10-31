import {
  ActionRowBuilder,
  MessageFlags,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  type ButtonInteraction,
  type StringSelectMenuInteraction,
  type ModalSubmitInteraction,
} from "discord.js";
import { makeEmbed } from "../core/embeds.js";
import { EMOJIS } from "../core/emojis.js";
import {
  getTicketConfig,
  getTicketPanel,
  getTicketById,
} from "../db/helpers/tickets.js";
import {
  openTicketChannel,
  claimTicket,
  closeTicket,
  canMemberManageTickets,
} from "../services/ticketService.js";
import { logger } from "../utils/logger.js";

// Concurrency guard to prevent duplicate rapid clicks
const pendingTicketCreations = new Set<string>();

export function registerTicketComponents(client: any) {
  // 1. Direct Button Ticket Open (when reason categories are disabled)
  client.components.set("ticket_open_direct", async (interaction: ButtonInteraction) => {
    const guild = interaction.guild;
    const member = interaction.member;
    if (!guild || !member) return;

    const panelId = interaction.customId.split(":")[1];
    const userLockKey = `${guild.id}:${interaction.user.id}`;

    if (pendingTicketCreations.has(userLockKey)) {
      return await interaction.reply({
        content: "⏳ Please wait, your ticket is currently being generated...",
        flags: MessageFlags.Ephemeral,
      });
    }

    pendingTicketCreations.add(userLockKey);
    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const panel = await getTicketPanel(guild.id, panelId);
      if (!panel) {
        return await interaction.editReply({
          content: "❌ Ticket panel configuration was not found.",
        });
      }

      const { channel } = await openTicketChannel({
        client,
        guild,
        member: member as any,
        panel,
        reasonCategory: null,
        reasonDetails: null,
      });

      return await interaction.editReply({
        content: `✅ Your ticket has been created! Head over to <#${channel.id}>.`,
      });
    } catch (err: any) {
      logger.error("[TICKET OPEN ERROR]:", err);
      return await interaction.editReply({
        content: `❌ Could not create ticket: ${err.message || "Unknown error"}`,
      });
    } finally {
      pendingTicketCreations.delete(userLockKey);
    }
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
    const userLockKey = `${guild.id}:${interaction.user.id}`;
    if (pendingTicketCreations.has(userLockKey)) {
      return await interaction.reply({
        content: "⏳ Please wait, your ticket is currently being generated...",
        flags: MessageFlags.Ephemeral,
      });
    }

    pendingTicketCreations.add(userLockKey);
    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const { channel } = await openTicketChannel({
        client,
        guild,
        member: member as any,
        panel,
        reasonCategory,
        reasonDetails: null,
      });

      return await interaction.editReply({
        content: `✅ Your **${reasonCategory.label}** ticket has been created! Head over to <#${channel.id}>.`,
      });
    } catch (err: any) {
      logger.error("[TICKET OPEN ERROR]:", err);
      return await interaction.editReply({
        content: `❌ Could not create ticket: ${err.message || "Unknown error"}`,
      });
    } finally {
      pendingTicketCreations.delete(userLockKey);
    }
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

    const userLockKey = `${guild.id}:${interaction.user.id}`;
    if (pendingTicketCreations.has(userLockKey)) {
      return await interaction.reply({
        content: "⏳ Please wait, your ticket is currently being generated...",
        flags: MessageFlags.Ephemeral,
      });
    }

    pendingTicketCreations.add(userLockKey);
    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const { channel } = await openTicketChannel({
        client,
        guild,
        member: member as any,
        panel,
        reasonCategory: reasonCategory || null,
        reasonDetails,
      });

      return await interaction.editReply({
        content: `✅ Your **${reasonCategory?.label || "Support"}** ticket has been created! Head over to <#${channel.id}>.`,
      });
    } catch (err: any) {
      logger.error("[TICKET OPEN ERROR]:", err);
      return await interaction.editReply({
        content: `❌ Could not create ticket: ${err.message || "Unknown error"}`,
      });
    } finally {
      pendingTicketCreations.delete(userLockKey);
    }
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
}
