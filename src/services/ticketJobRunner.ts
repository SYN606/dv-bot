import { type DVClient } from "../core/client.js";
import { type TextChannel } from "discord.js";
import {
  getPendingTicketJobs,
  claimTicketJob,
  completeTicketJob,
  failTicketJob,
  getTicketById,
  updateTicket,
} from "../db/helpers/tickets.js";
import { makeEmbed, COLORS } from "../core/embeds.js";
import { logger } from "../utils/logger.js";
import { sendTicketLog, closeTicket } from "./ticketService.js";
import { recordSlaFirstResponse } from "../db/helpers/ticketAdvanced.js";

export class TicketJobRunner {
  private client: any;
  private interval: NodeJS.Timeout | null = null;
  private isProcessing = false;

  constructor(client: any) {
    this.client = client;
  }

  public start(pollIntervalMs = 30000) {
    if (this.interval) return;
    logger.info("[TICKET JOBS] Starting persistent ticket job runner...");
    this.interval = setInterval(() => {
      this.processJobs().catch((err) =>
        logger.error(`[TICKET JOBS ERROR]: ${err.message}`)
      );
    }, pollIntervalMs);
    if (this.interval.unref) this.interval.unref();

    // Initial check after 5 seconds
    setTimeout(() => {
      this.processJobs().catch(() => null);
    }, 5000);
  }

  public stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  private async processJobs() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const jobs = await getPendingTicketJobs();
      if (!jobs || jobs.length === 0) return;

      for (const job of jobs) {
        const claimed = await claimTicketJob(job.id);
        if (!claimed) continue;

        try {
          await this.executeJob(job);
          await completeTicketJob(job.id);
        } catch (err: any) {
          logger.warn(`[TICKET JOB ${job.id} FAILED]: ${err.message}`);
          await failTicketJob(job.id, err.message || "Unknown execution error");
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private async executeJob(job: any) {
    let guild = this.client.guilds?.cache?.get(job.guild_id);
    if (!guild && this.client.guilds?.fetch) {
      guild = await this.client.guilds.fetch(job.guild_id).catch(() => null);
    }
    if (!guild) {
      // Guild not found or bot removed
      return;
    }

    switch (job.job_type) {
      case "sla_check": {
        if (!job.ticket_id) return;
        const ticket = await getTicketById(job.ticket_id);
        if (!ticket || ticket.status === "closed" || ticket.status === "resolved" || ticket.status === "claimed" || ticket.claimed_by) {
          return;
        }

        const now = Date.now();
        const payload = job.payload || {};

        // Check first response deadline
        if (!ticket.first_response_at && payload.firstDeadline) {
          const firstDeadlineTime = new Date(payload.firstDeadline).getTime();
          if (now >= firstDeadlineTime) {
            // SLA First Response Breached!
            if (ticket.channel_id) {
              const ch = (await guild.channels.fetch(ticket.channel_id).catch(() => null)) as TextChannel | null;
              if (ch && ch.isTextBased()) {
                // Verify against channel messages: check if staff replied or conversation occurred
                const recentMsgs = await ch.messages.fetch({ limit: 15 }).catch(() => null);
                if (recentMsgs && recentMsgs.size > 0) {
                  const hasStaffReply = recentMsgs.some(
                    (m: any) => !m.author.bot && m.author.id !== ticket.user_id
                  );
                  const nonBotCount = recentMsgs.filter((m: any) => !m.author.bot).size;

                  // If staff has replied or first 5+ messages have been exchanged, mark as responded
                  if (hasStaffReply || nonBotCount >= 5) {
                    await recordSlaFirstResponse(ticket.id).catch(() => null);
                    await updateTicket(ticket.id, {
                      first_response_at: new Date().toISOString(),
                    }).catch(() => null);
                    break;
                  }
                }

                const alertEmbed = makeEmbed({
                  title: "⚠️ SLA First Response Overdue",
                  description: `This ticket has not received an initial staff response within the target timeframe for **${ticket.priority?.toUpperCase()}** priority.`,
                  color: COLORS.WARNING,
                  fields: [
                    { name: "Ticket", value: `#${ticket.ticket_number}`, inline: true },
                    { name: "Priority", value: ticket.priority || "normal", inline: true },
                    { name: "Opened By", value: `<@${ticket.user_id}>`, inline: true },
                  ],
                });
                await ch.send({ embeds: [alertEmbed] }).catch(() => null);
              }
            }

            // Escalate if not already escalated
            if (ticket.status !== "escalated") {
              await updateTicket(ticket.id, {
                status: "escalated",
                updated_at: new Date().toISOString(),
              });
            }
          }
        }
        break;
      }

      case "auto_close": {
        if (!job.ticket_id) return;
        const ticket = await getTicketById(job.ticket_id);
        if (!ticket || ticket.status === "closed") return;

        const reason = job.payload?.reason || "Ticket auto-closed due to inactivity.";
        await closeTicket({
          client: this.client,
          guild,
          ticketId: ticket.id,
          closedByMember: { id: "system", tag: "System Auto-Close" },
          reason,
        });
        break;
      }

      case "send_reminder": {
        if (!job.ticket_id) return;
        const ticket = await getTicketById(job.ticket_id);
        if (!ticket || ticket.status === "closed" || !ticket.channel_id) return;

        const ch = (await guild.channels.fetch(ticket.channel_id).catch(() => null)) as TextChannel | null;
        if (ch && ch.isTextBased()) {
          const reminderMsg =
            job.payload?.message ||
            `Friendly reminder for <@${ticket.user_id}>: Please let us know if you still need assistance, or this ticket will be automatically closed.`;
          await ch.send({ content: reminderMsg }).catch(() => null);
        }
        break;
      }

      default:
        logger.warn(`[TICKET JOBS] Unknown job type: ${job.job_type}`);
    }
  }
}
