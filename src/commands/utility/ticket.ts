import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  SlashCommandBuilder,
  type TextChannel,
} from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed, COLORS } from "../../core/embeds.js";
import {
  getTicketConfig,
  getTicketByChannel,
  updateTicket,
  assignTicketStaff,
  unassignTicketStaff,
  addTicketNote,
  initTicketSla,
  logTicketEvent,
} from "../../db/helpers/tickets.js";
import {
  closeTicket,
  claimTicket,
  canMemberManageTickets,
  sendTicketLog,
  generateHtmlTranscript,
  createTicketVoiceChannel,
  deleteTicketVoiceChannel,
} from "../../services/ticketService.js";
import { transitionTicketState } from "../../services/ticketLifecycleService.js";

const slashBuilder = new SlashCommandBuilder()
  .setName("ticket")
  .setDescription("Enterprise support ticket management")
  .addSubcommand((sub) =>
    sub
      .setName("close")
      .setDescription("Close and archive the current support ticket.")
      .addStringOption((opt) =>
        opt.setName("reason").setDescription("Reason for closing the ticket").setRequired(false)
      )
  )
  .addSubcommand((sub) =>
    sub.setName("claim").setDescription("Claim ownership of the current support ticket.")
  )
  .addSubcommand((sub) =>
    sub
      .setName("add")
      .setDescription("Add a member to the current ticket channel.")
      .addUserOption((opt) => opt.setName("user").setDescription("The user to add").setRequired(true))
  )
  .addSubcommand((sub) =>
    sub
      .setName("remove")
      .setDescription("Remove a member from the current ticket channel.")
      .addUserOption((opt) => opt.setName("user").setDescription("The user to remove").setRequired(true))
  )
  .addSubcommand((sub) =>
    sub
      .setName("assign")
      .setDescription("Assign a staff member to handle this ticket.")
      .addUserOption((opt) => opt.setName("staff").setDescription("Staff member to assign").setRequired(true))
  )
  .addSubcommand((sub) =>
    sub.setName("unassign").setDescription("Remove the current staff assignment from this ticket.")
  )
  .addSubcommand((sub) =>
    sub
      .setName("transfer")
      .setDescription("Transfer ticket responsibility to another staff member.")
      .addUserOption((opt) => opt.setName("staff").setDescription("New staff member").setRequired(true))
  )
  .addSubcommand((sub) =>
    sub
      .setName("priority")
      .setDescription("Change the priority and SLA level of this ticket.")
      .addStringOption((opt) =>
        opt
          .setName("level")
          .setDescription("Priority tier")
          .setRequired(true)
          .addChoices(
            { name: "Low", value: "low" },
            { name: "Normal", value: "normal" },
            { name: "High", value: "high" },
            { name: "Urgent", value: "urgent" }
          )
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName("escalate")
      .setDescription("Escalate this ticket to senior support and mark as urgent.")
      .addStringOption((opt) => opt.setName("reason").setDescription("Reason for escalation").setRequired(false))
  )
  .addSubcommand((sub) =>
    sub
      .setName("note")
      .setDescription("Add a private internal staff note (visible to staff only).")
      .addStringOption((opt) => opt.setName("content").setDescription("Note details").setRequired(true))
  )
  .addSubcommand((sub) =>
    sub
      .setName("rename")
      .setDescription("Rename the ticket channel.")
      .addStringOption((opt) => opt.setName("name").setDescription("New channel name").setRequired(true))
  )
  .addSubcommand((sub) =>
    sub.setName("transcript").setDescription("Generate and export a full HTML chat transcript.")
  )
  .addSubcommand((sub) =>
    sub
      .setName("resolve")
      .setDescription("Mark ticket as resolved and await user confirmation.")
      .addStringOption((opt) => opt.setName("notes").setDescription("Resolution notes").setRequired(false))
  )
  .addSubcommand((sub) =>
    sub.setName("reopen").setDescription("Reopen a resolved or closed ticket.")
  )
  .addSubcommand((sub) =>
    sub
      .setName("voice")
      .setDescription("Create or remove a private voice channel for this ticket.")
      .addStringOption((opt) =>
        opt
          .setName("action")
          .setDescription("Action to perform")
          .setRequired(false)
          .addChoices(
            { name: "Create VC", value: "create" },
            { name: "Delete VC", value: "delete" }
          )
      )
  );

export default createCommand({
  name: "ticket",
  description: "Manage enterprise support tickets.",
  category: "Tickets",
  aliases: ["tickets"],
  usage: "<subcommand> [options]",
  examples: [
    "/ticket close reason:Issue resolved",
    "/ticket claim",
    "/ticket assign staff:@Mod",
    "/ticket priority level:urgent",
    "/ticket note content:User needs billing check",
    "/ticket transcript",
  ],
  slashBuilder,

  async execute(ctx) {
    const { client, guild, user, member, channel } = ctx;
    if (!guild) {
      return await ctx.reply("This command can only be used inside a server.");
    }

    const subcommand = ctx.subcommand || ctx.options.subcommand || ctx.options._args?.[0] || "help";
    const config = await getTicketConfig(guild.id);
    const textChannel = channel as TextChannel;

    const validSubcommands = new Set<string>([
      "close", "claim", "add", "remove", "assign", "unassign", "transfer",
      "priority", "escalate", "note", "rename", "transcript", "resolve", "reopen",
      "voice", "vc",
    ]);

    if (!validSubcommands.has(subcommand)) {
      return await ctx.reply({
        content:
          "**Ticket Commands:**\n" +
          "• `/ticket close [reason]` - Close ticket and generate transcript\n" +
          "• `/ticket claim` - Claim this ticket\n" +
          "• `/ticket assign @staff` - Assign a staff member\n" +
          "• `/ticket unassign` - Remove staff assignment\n" +
          "• `/ticket priority <level>` - Set priority (low|normal|high|urgent)\n" +
          "• `/ticket escalate [reason]` - Escalate to Senior Staff\n" +
          "• `/ticket note <content>` - Add private staff note\n" +
          "• `/ticket add @user` - Add user to channel\n" +
          "• `/ticket remove @user` - Remove user from channel\n" +
          "• `/ticket transcript` - Export HTML transcript\n" +
          "• `/ticket voice [create|delete]` - Create or end private ticket voice channel\n" +
          "• `/ticket resolve [notes]` - Mark resolved",
        flags: MessageFlags.Ephemeral,
      });
    }

    const ticket = await getTicketByChannel(channel.id);
    if (!ticket) {
      return await ctx.reply({
        content: "❌ This channel is not an active support ticket.",
        flags: MessageFlags.Ephemeral,
      });
    }

    if (ticket.status === "closed" && subcommand !== "reopen") {
      return await ctx.reply({
        content: "❌ This ticket is already closed and archived. Use `/ticket reopen` to resume.",
        flags: MessageFlags.Ephemeral,
      });
    }

    const isOpener = ticket.user_id === user.id;
    const canManage = canMemberManageTickets(member, config);

    // Permission enforcement: opener-or-staff for close, transcript, voice; staff-only for the rest
    const openerOrStaff = new Set<string>(["close", "transcript", "voice", "vc"]);
    if (openerOrStaff.has(subcommand)) {
      if (!isOpener && !canManage) {
        return await ctx.reply({
          content: "❌ You do not have permission to manage this support ticket.",
          flags: MessageFlags.Ephemeral,
        });
      }
    } else if (!canManage) {
      return await ctx.reply({
        content: "❌ You do not have permission to manage support tickets.",
        flags: MessageFlags.Ephemeral,
      });
    }

    // 1. CLOSE TICKET
    if (subcommand === "close") {
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
      const targetUser = ctx.options.user || ctx.options._args?.[1];
      const targetUserId = typeof targetUser === "object" ? targetUser.id : String(targetUser || "").replace(/[<@!>]/g, "");

      if (!targetUserId) {
        return await ctx.reply({
          content: "❌ Please mention a valid user to add to this ticket.",
          flags: MessageFlags.Ephemeral,
        });
      }

      try {
        await textChannel.permissionOverwrites.edit(targetUserId, {
          ViewChannel: true,
          SendMessages: true,
          AttachFiles: true,
          EmbedLinks: true,
          ReadMessageHistory: true,
        });

        const notifyEmbed = makeEmbed({
          title: "👤 Member Added to Ticket",
          description: `<@${targetUserId}> has been granted access to this ticket by <@${user.id}>.`,
          color: COLORS.SUCCESS,
        });
        await textChannel.send({ embeds: [notifyEmbed] });

        await logTicketEvent({
          ticket_id: ticket.id,
          guild_id: guild.id,
          actor_id: user.id,
          actor_tag: user.tag,
          event_type: "member_added",
          event_data: { user_id: targetUserId },
        });

        return await ctx.reply({
          content: `✅ Successfully added <@${targetUserId}> to this ticket.`,
          flags: MessageFlags.Ephemeral,
        });
      } catch (err: any) {
        return await ctx.reply({
          content: `❌ Failed to update channel permissions: ${err.message}`,
          flags: MessageFlags.Ephemeral,
        });
      }
    }

    // 4. REMOVE USER FROM TICKET
    if (subcommand === "remove") {
      const targetUser = ctx.options.user || ctx.options._args?.[1];
      const targetUserId = typeof targetUser === "object" ? targetUser.id : String(targetUser || "").replace(/[<@!>]/g, "");

      if (!targetUserId) {
        return await ctx.reply({
          content: "❌ Please mention a valid user to remove from this ticket.",
          flags: MessageFlags.Ephemeral,
        });
      }

      if (targetUserId === ticket.user_id) {
        return await ctx.reply({
          content: "❌ You cannot remove the ticket opener from their own ticket. Use `/ticket close` instead.",
          flags: MessageFlags.Ephemeral,
        });
      }

      try {
        await textChannel.permissionOverwrites.delete(targetUserId);

        const notifyEmbed = makeEmbed({
          title: "👤 Member Removed from Ticket",
          description: `<@${targetUserId}> was removed from this ticket by <@${user.id}>.`,
          color: COLORS.WARNING,
        });
        await textChannel.send({ embeds: [notifyEmbed] });

        await logTicketEvent({
          ticket_id: ticket.id,
          guild_id: guild.id,
          actor_id: user.id,
          actor_tag: user.tag,
          event_type: "member_removed",
          event_data: { user_id: targetUserId },
        });

        return await ctx.reply({
          content: `✅ Successfully removed <@${targetUserId}> from this ticket.`,
          flags: MessageFlags.Ephemeral,
        });
      } catch (err: any) {
        return await ctx.reply({
          content: `❌ Failed to update channel permissions: ${err.message}`,
          flags: MessageFlags.Ephemeral,
        });
      }
    }

    // 5. ASSIGN STAFF
    if (subcommand === "assign" || subcommand === "transfer") {
      const targetStaff = ctx.options.staff;
      const targetStaffId = typeof targetStaff === "object" ? targetStaff.id : String(targetStaff || "").replace(/[<@!>]/g, "");

      if (!targetStaffId) {
        return await ctx.reply({
          content: "❌ Please provide a valid staff member to assign.",
          flags: MessageFlags.Ephemeral,
        });
      }

      const staffMember = await guild.members.fetch(targetStaffId).catch(() => null);
      if (!staffMember) {
        return await ctx.reply({
          content: "❌ Staff member could not be found in this server.",
          flags: MessageFlags.Ephemeral,
        });
      }

      await assignTicketStaff({
        ticket_id: ticket.id,
        guild_id: guild.id,
        staff_id: staffMember.id,
        staff_tag: staffMember.user.tag,
        assigned_by: user.id,
        assigned_by_tag: user.tag,
      });

      // Grant channel access
      await textChannel.permissionOverwrites.edit(staffMember.id, {
        ViewChannel: true,
        SendMessages: true,
        AttachFiles: true,
        EmbedLinks: true,
        ReadMessageHistory: true,
      }).catch(() => null);

      const assignEmbed = makeEmbed({
        title: "📋 Ticket Assigned",
        description: `This ticket has been assigned to <@${staffMember.id}> by <@${user.id}>.`,
        color: COLORS.SUCCESS,
      });
      await textChannel.send({ embeds: [assignEmbed] });

      return await ctx.reply({
        content: `✅ Ticket #${ticket.ticket_number} assigned to <@${staffMember.id}>.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    // 6. UNASSIGN STAFF
    if (subcommand === "unassign") {
      await unassignTicketStaff(ticket.id, user.id, user.tag, guild.id);

      const unassignEmbed = makeEmbed({
        title: "📋 Ticket Unassigned",
        description: `Staff assignment was removed by <@${user.id}>. The ticket is now open for claiming.`,
        color: COLORS.INFO,
      });
      await textChannel.send({ embeds: [unassignEmbed] });

      return await ctx.reply({
        content: "✅ Ticket unassigned successfully.",
        flags: MessageFlags.Ephemeral,
      });
    }

    // 7. CHANGE PRIORITY
    if (subcommand === "priority") {
      const priorityLevel = (ctx.options.level || "normal").toLowerCase();
      await updateTicket(ticket.id, { priority: priorityLevel });
      await initTicketSla({ ticket_id: ticket.id, guild_id: guild.id, priority: priorityLevel });

      await logTicketEvent({
        ticket_id: ticket.id,
        guild_id: guild.id,
        actor_id: user.id,
        actor_tag: user.tag,
        event_type: "priority_changed",
        event_data: { priority: priorityLevel },
      });

      const priorityColors: Record<string, number> = {
        low: COLORS.INFO,
        normal: COLORS.SUCCESS,
        high: COLORS.WARNING,
        urgent: 0xff3b30,
      };

      const pEmbed = makeEmbed({
        title: `⚡ Priority Set: ${priorityLevel.toUpperCase()}`,
        description: `Ticket priority updated to **${priorityLevel}** by <@${user.id}>.\nSLA targets have been recalibrated.`,
        color: priorityColors[priorityLevel] || COLORS.INFO,
      });
      await textChannel.send({ embeds: [pEmbed] });

      return await ctx.reply({
        content: `✅ Priority set to **${priorityLevel}**.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    // 8. ESCALATE TICKET
    if (subcommand === "escalate") {
      const reason = ctx.options.reason || "Senior staff escalation requested";
      await transitionTicketState({
        guild,
        ticketId: ticket.id,
        nextStatus: "escalated",
        actor: { id: user.id, tag: user.tag },
        reason,
      });
      await updateTicket(ticket.id, { priority: "urgent" });

      const escEmbed = makeEmbed({
        title: "🚨 Ticket Escalated",
        description: `This ticket has been escalated to **Senior Support** by <@${user.id}>.\n\n**Escalation Reason:** ${reason}`,
        color: 0xff3b30,
      });
      await textChannel.send({ embeds: [escEmbed] });

      return await ctx.reply({
        content: "✅ Ticket escalated to Senior Support.",
        flags: MessageFlags.Ephemeral,
      });
    }

    // 9. INTERNAL STAFF NOTE
    if (subcommand === "note") {
      const content = ctx.options.content;
      if (!content || !content.trim()) {
        return await ctx.reply({
          content: "❌ Please provide note content.",
          flags: MessageFlags.Ephemeral,
        });
      }

      await addTicketNote({
        ticket_id: ticket.id,
        guild_id: guild.id,
        author_id: user.id,
        author_tag: user.tag,
        content: content.trim(),
      });

      return await ctx.reply({
        content: "📝 Private staff note recorded successfully. (Only staff can see this note in the dashboard)",
        flags: MessageFlags.Ephemeral,
      });
    }

    // 10. RENAME TICKET CHANNEL
    if (subcommand === "rename") {
      const newName = ctx.options.name.toLowerCase().replace(/[^a-z0-9_-]/g, "-").slice(0, 32);
      await textChannel.setName(newName);

      return await ctx.reply({
        content: `✅ Ticket channel renamed to \`${newName}\`.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    // 11. GENERATE TRANSCRIPT DIRECTLY
    if (subcommand === "transcript") {
      await ctx.reply({ content: "⏳ Generating full HTML transcript..." });
      const html = await generateHtmlTranscript(textChannel, ticket);
      const attachment = new AttachmentBuilder(Buffer.from(html, "utf-8"), {
        name: `transcript-ticket-${ticket.ticket_number}.html`,
      });

      return await textChannel.send({
        content: `📄 Chat transcript for Ticket #${ticket.ticket_number}:`,
        files: [attachment],
      });
    }

    // 12. RESOLVE TICKET
    if (subcommand === "resolve") {
      const notes = ctx.options.notes || "Marked resolved by staff";
      try {
        await transitionTicketState({
          guild,
          ticketId: ticket.id,
          nextStatus: "resolved",
          actor: { id: user.id, tag: user.tag },
          reason: notes,
        });

        return await ctx.reply({
          content: "✅ Ticket marked as resolved. Opener will receive a prompt to verify or close.",
          flags: MessageFlags.Ephemeral,
        });
      } catch (err: any) {
        return await ctx.reply({
          content: `❌ ${err.message}`,
          flags: MessageFlags.Ephemeral,
        });
      }
    }

    // 13. REOPEN TICKET
    if (subcommand === "reopen") {
      try {
        await transitionTicketState({
          guild,
          ticketId: ticket.id,
          nextStatus: "reopened",
          actor: { id: user.id, tag: user.tag },
        });

        return await ctx.reply({
          content: "✅ Ticket reopened.",
          flags: MessageFlags.Ephemeral,
        });
      } catch (err: any) {
        return await ctx.reply({
          content: `❌ Could not reopen ticket: ${err.message}`,
          flags: MessageFlags.Ephemeral,
        });
      }
    }

    // 14. TICKET VOICE CHANNEL (VC)
    if (subcommand === "voice" || subcommand === "vc") {
      const action = (ctx.options.action || ctx.options._args?.[1] || "create").toLowerCase();

      if (action === "delete" || action === "remove" || action === "end") {
        const deleted = await deleteTicketVoiceChannel({
          guild,
          ticket,
          actor: { id: user.id, tag: user.tag },
        });

        if (!deleted) {
          return await ctx.reply({
            content: "ℹ️ There is no active voice channel for this ticket.",
            flags: MessageFlags.Ephemeral,
          });
        }

        return await ctx.reply({
          embeds: [
            makeEmbed({
              title: "🔇 Voice Channel Ended",
              description: `The private voice channel for Ticket #${ticket.ticket_number} has been deleted by <@${user.id}>.`,
              level: "INFO",
            }),
          ],
        });
      }

      // Default: Create VC
      try {
        const { voiceChannel, alreadyExists } = await createTicketVoiceChannel({
          client,
          guild,
          member: member as any,
          ticket,
        });

        const joinUrl = `https://discord.com/channels/${guild.id}/${voiceChannel.id}`;
        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
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
          return await ctx.reply({
            content: `🔊 A private voice channel is already active for this ticket: <#${voiceChannel.id}>`,
            components: [row],
          });
        }

        return await ctx.reply({
          embeds: [
            makeEmbed({
              title: "🎙️ Private Ticket Voice Channel Created",
              description:
                `A dedicated private voice channel has been created for **Ticket #${ticket.ticket_number}**.\n\n` +
                `🔊 **Channel:** <#${voiceChannel.id}>\n` +
                `🔒 **Access Restricted:** Only the ticket creator (<@${ticket.user_id}>) and assigned ticket helpers can view and join this voice channel.`,
              level: "SUCCESS",
              color: COLORS.SUCCESS,
            }),
          ],
          components: [row],
        });
      } catch (err: any) {
        return await ctx.reply({
          content: `❌ Could not create voice channel: ${err.message || "Unknown error"}`,
          flags: MessageFlags.Ephemeral,
        });
      }
    }
  },
});
