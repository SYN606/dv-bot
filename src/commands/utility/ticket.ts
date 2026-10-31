import {
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type TextChannel,
} from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed } from "../../core/embeds.js";
import { EMOJIS } from "../../core/emojis.js";
import {
  getTicketConfig,
  getTicketByChannel,
  getTicketPanels,
} from "../../db/helpers/tickets.js";
import {
  closeTicket,
  claimTicket,
  canMemberManageTickets,
  deployTicketPanel,
} from "../../services/ticketService.js";

const slashBuilder = new SlashCommandBuilder()
  .setName("ticket")
  .setDescription("Manage support tickets (close, claim, add members, or deploy panel)")
  .addSubcommand((sub) =>
    sub
      .setName("close")
      .setDescription("Close and archive the current support ticket.")
      .addStringOption((opt) =>
        opt
          .setName("reason")
          .setDescription("Reason for closing the ticket")
          .setRequired(false)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName("claim")
      .setDescription("Claim ownership of the current support ticket.")
  )
  .addSubcommand((sub) =>
    sub
      .setName("add")
      .setDescription("Add a member to the current ticket channel.")
      .addUserOption((opt) =>
        opt
          .setName("user")
          .setDescription("The user to add")
          .setRequired(true)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName("remove")
      .setDescription("Remove a member from the current ticket channel.")
      .addUserOption((opt) =>
        opt
          .setName("user")
          .setDescription("The user to remove")
          .setRequired(true)
      )
  );

export default createCommand({
  name: "ticket",
  description: "Manage support tickets (close, claim, add members).",
  category: "Utility",
  aliases: ["tickets"],
  usage: "<close|claim|add|remove> [options]",
  examples: [
    "/ticket close reason:Issue resolved",
    "/ticket claim",
    "/ticket add user:@Friend",
    "/ticket remove user:@Friend",
  ],
  slashBuilder,

  async execute(ctx) {
    const { client, guild, user, member, channel } = ctx;
    if (!guild) {
      return await ctx.reply("This command can only be used inside a server.");
    }

    const subcommand = ctx.subcommand || ctx.options.subcommand || ctx.options._args?.[0] || "help";
    const config = await getTicketConfig(guild.id);

    // 1. CLOSE TICKET
    if (subcommand === "close") {
      const ticket = await getTicketByChannel(channel.id);
      if (!ticket || ticket.status === "closed") {
        return await ctx.reply({
          content: "❌ This channel is not an active support ticket.",
          flags: MessageFlags.Ephemeral,
        });
      }

      const isOpener = ticket.user_id === user.id;
      const canManage = canMemberManageTickets(member, config);

      if (!isOpener && !canManage) {
        return await ctx.reply({
          content: "❌ You do not have permission to close this ticket.",
          flags: MessageFlags.Ephemeral,
        });
      }

      const closeReason = ctx.options.reason || ctx.options._args?.slice(1).join(" ") || "Resolved";
      await ctx.reply({
        content: `🔒 Closing ticket #${ticket.ticket_number}... Archiving transcript and cleaning up.`,
      });

      await closeTicket({
        client,
        guild,
        ticketId: ticket.id,
        closedByMember: member,
        reason: closeReason,
      });
      return;
    }

    // 2. CLAIM TICKET
    if (subcommand === "claim") {
      const ticket = await getTicketByChannel(channel.id);
      if (!ticket || ticket.status === "closed") {
        return await ctx.reply({
          content: "❌ This channel is not an active support ticket.",
          flags: MessageFlags.Ephemeral,
        });
      }

      if (!canMemberManageTickets(member, config)) {
        return await ctx.reply({
          content: "❌ You do not have permission to claim support tickets.",
          flags: MessageFlags.Ephemeral,
        });
      }

      try {
        const updated = await claimTicket({
          guild,
          member,
          ticketId: ticket.id,
        });

        return await ctx.reply({
          content: `✅ You have successfully claimed ticket **#${updated.ticket_number}**!`,
        });
      } catch (err: any) {
        return await ctx.reply({
          content: `❌ ${err.message || "Failed to claim ticket."}`,
          flags: MessageFlags.Ephemeral,
        });
      }
    }

    // 3. ADD USER TO TICKET
    if (subcommand === "add") {
      const ticket = await getTicketByChannel(channel.id);
      if (!ticket || ticket.status === "closed") {
        return await ctx.reply({
          content: "❌ This channel is not an active support ticket.",
          flags: MessageFlags.Ephemeral,
        });
      }

      if (!canMemberManageTickets(member, config) && ticket.user_id !== user.id) {
        return await ctx.reply({
          content: "❌ You do not have permission to add members to this ticket.",
          flags: MessageFlags.Ephemeral,
        });
      }

      const targetUser = ctx.options.user || (ctx.options._args?.[1] ? await client.users.fetch(ctx.options._args[1]).catch(() => null) : null);
      if (!targetUser) {
        return await ctx.reply({
          content: "❌ Please mention a valid user to add.",
          flags: MessageFlags.Ephemeral,
        });
      }

      const textChannel = channel as TextChannel;
      await textChannel.permissionOverwrites.edit(targetUser.id, {
        ViewChannel: true,
        SendMessages: true,
        AttachFiles: true,
        EmbedLinks: true,
        ReadMessageHistory: true,
      });

      return await ctx.reply({
        content: `✅ Added <@${targetUser.id}> to ticket #${ticket.ticket_number}.`,
      });
    }

    // 4. REMOVE USER FROM TICKET
    if (subcommand === "remove") {
      const ticket = await getTicketByChannel(channel.id);
      if (!ticket || ticket.status === "closed") {
        return await ctx.reply({
          content: "❌ This channel is not an active support ticket.",
          flags: MessageFlags.Ephemeral,
        });
      }

      if (!canMemberManageTickets(member, config)) {
        return await ctx.reply({
          content: "❌ You do not have permission to remove members from this ticket.",
          flags: MessageFlags.Ephemeral,
        });
      }

      const targetUser = ctx.options.user || (ctx.options._args?.[1] ? await client.users.fetch(ctx.options._args[1]).catch(() => null) : null);
      if (!targetUser) {
        return await ctx.reply({
          content: "❌ Please mention a valid user to remove.",
          flags: MessageFlags.Ephemeral,
        });
      }

      if (targetUser.id === ticket.user_id) {
        return await ctx.reply({
          content: "❌ You cannot remove the ticket opener from their own ticket.",
          flags: MessageFlags.Ephemeral,
        });
      }

      const textChannel = channel as TextChannel;
      await textChannel.permissionOverwrites.delete(targetUser.id).catch(() => null);

      return await ctx.reply({
        content: `✅ Removed <@${targetUser.id}> from ticket #${ticket.ticket_number}.`,
      });
    }

    return await ctx.reply({
      embeds: [
        makeEmbed({
          title: "Ticket Commands",
          description:
            `• \`/ticket close [reason]\` - Close and archive the current ticket.\n` +
            `• \`/ticket claim\` - Claim the current ticket as staff.\n` +
            `• \`/ticket add <@user>\` - Add a user to this ticket.\n` +
            `• \`/ticket remove <@user>\` - Remove a user from this ticket.\n\n` +
            `*Configure ticket panels and reason categories in the Web Dashboard.*`,
          color: "#6366F1",
        }),
      ],
      flags: MessageFlags.Ephemeral,
    });
  },
});
