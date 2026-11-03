import {
  type Guild,
  type GuildMember,
  type TextChannel,
} from "discord.js";
import {
  getTicketById,
  updateTicket,
  logTicketEvent,
  recordSlaResolved,
} from "../db/helpers/tickets.js";
import { makeEmbed, COLORS } from "../core/embeds.js";
import { logger } from "../utils/logger.js";
import { sendTicketLog, closeTicket } from "./ticketService.js";

export type TicketStatus =
  | "open"
  | "claimed"
  | "waiting_user"
  | "on_hold"
  | "escalated"
  | "resolved"
  | "reopened"
  | "closed";

// Valid transitions dictionary
const VALID_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  open: ["claimed", "waiting_user", "on_hold", "escalated", "resolved", "closed"],
  claimed: ["open", "waiting_user", "on_hold", "escalated", "resolved", "closed"],
  waiting_user: ["open", "claimed", "escalated", "resolved", "closed"],
  on_hold: ["open", "claimed", "escalated", "resolved", "closed"],
  escalated: ["claimed", "waiting_user", "on_hold", "resolved", "closed"],
  resolved: ["closed", "reopened"],
  reopened: ["claimed", "waiting_user", "on_hold", "escalated", "resolved", "closed"],
  closed: ["reopened"],
};

/**
 * Validates whether a state transition is permitted by the state engine.
 */
export function canTransition(current: TicketStatus, next: TicketStatus): boolean {
  if (current === next) return true;
  const allowed = VALID_TRANSITIONS[current] || [];
  return allowed.includes(next);
}

/**
 * Executes a verified ticket lifecycle transition.
 */
export async function transitionTicketState(params: {
  guild: Guild;
  ticketId: string;
  nextStatus: TicketStatus;
  actor: { id: string; tag: string };
  reason?: string;
  config?: any;
}) {
  const ticket = await getTicketById(params.ticketId);
  if (!ticket) {
    throw new Error(`Ticket '${params.ticketId}' not found.`);
  }

  const currentStatus = (ticket.status || "open") as TicketStatus;
  if (!canTransition(currentStatus, params.nextStatus)) {
    if (currentStatus === "closed") {
      throw new Error(
        `This ticket is already closed and archived. To make changes or mark it as ${params.nextStatus}, please reopen the ticket first using '/ticket reopen'.`
      );
    }
    if (currentStatus === "resolved" && params.nextStatus === "open") {
      throw new Error(
        "This ticket is currently resolved. To reopen it for assistance, use '/ticket reopen'."
      );
    }
    throw new Error(
      `Cannot move ticket from '${currentStatus}' to '${params.nextStatus}'.`
    );
  }

  if (params.nextStatus === "closed") {
    return await closeTicket({
      client: params.guild.client,
      guild: params.guild,
      ticketId: params.ticketId,
      closedByMember: { id: params.actor.id, tag: params.actor.tag },
      reason: params.reason || "Closed via lifecycle transition",
    });
  }

  const updates: Record<string, any> = {
    status: params.nextStatus,
    updated_at: new Date().toISOString(),
  };

  if (params.nextStatus === "resolved") {
    await recordSlaResolved(params.ticketId);
  } else if (params.nextStatus === "reopened") {
    updates.closed_at = null;
    updates.closed_by = null;
    updates.closed_by_tag = null;
    updates.close_reason = null;
    updates.resolved_at = null;

    // Restore ticket opener write permissions in channel
    if (ticket.channel_id && ticket.user_id) {
      try {
        const channel = (await params.guild.channels.fetch(ticket.channel_id).catch(() => null)) as TextChannel | null;
        if (channel) {
          await channel.permissionOverwrites.edit(ticket.user_id, {
            ViewChannel: true,
            SendMessages: true,
            AttachFiles: true,
            EmbedLinks: true,
            ReadMessageHistory: true,
          }).catch(() => null);
        }
      } catch (_) {}
    }
  }

  const updatedTicket = await updateTicket(params.ticketId, updates);

  // Record immutable audit event
  await logTicketEvent({
    ticket_id: params.ticketId,
    guild_id: params.guild.id,
    actor_id: params.actor.id,
    actor_tag: params.actor.tag,
    event_type: `status_changed_to_${params.nextStatus}`,
    event_data: {
      from: currentStatus,
      to: params.nextStatus,
      reason: params.reason || null,
    },
  });

  // Post to ticket channel if active
  if (ticket.channel_id) {
    try {
      const channel = (await params.guild.channels.fetch(ticket.channel_id).catch(() => null)) as TextChannel | null;
      if (channel && channel.isTextBased()) {
        const statusColors: Record<string, number> = {
          open: COLORS.INFO,
          claimed: COLORS.SUCCESS,
          waiting_user: COLORS.WARNING,
          on_hold: COLORS.SECONDARY,
          escalated: 0xff3b30,
          resolved: 0x34c759,
          reopened: COLORS.INFO,
        };

        const noticeEmbed = makeEmbed({
          title: `Ticket Status Updated: ${params.nextStatus.toUpperCase().replace("_", " ")}`,
          description: `Ticket status has been transitioned from \`${currentStatus}\` to \`${params.nextStatus}\` by <@${params.actor.id}>.${params.reason ? `\n\n**Reason:** ${params.reason}` : ""}`,
          color: statusColors[params.nextStatus] || COLORS.INFO,
          footer: { text: `Ticket #${String(ticket.ticket_number).padStart(4, "0")}` },
        });

        await channel.send({ embeds: [noticeEmbed] }).catch(() => null);
      }
    } catch (err: any) {
      logger.warn(`[LIFECYCLE CHANNEL NOTIFY ERROR]: ${err.message}`);
    }
  }

  // Dispatch log
  const logEmbed = makeEmbed({
    title: "Ticket Status Transition",
    color: COLORS.INFO,
    fields: [
      { name: "Ticket", value: `#${ticket.ticket_number} (<#${ticket.channel_id || "deleted"}>)`, inline: true },
      { name: "Transition", value: `\`${currentStatus}\` ➔ \`${params.nextStatus}\``, inline: true },
      { name: "Actor", value: `<@${params.actor.id}> (${params.actor.tag})`, inline: true },
      ...(params.reason ? [{ name: "Reason", value: params.reason }] : []),
    ],
    timestamp: true,
  });
  await sendTicketLog(params.guild, logEmbed);

  return updatedTicket;
}
