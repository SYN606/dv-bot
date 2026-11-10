import crypto from "node:crypto";
import {
  Ticket,
  TicketNote,
  TicketEvent,
  TicketAssignment,
  TicketSla,
  TicketJob,
  TicketFeedback,
  Op,
} from "../models/index.js";

/**
 * Logs an immutable event in the ticket activity audit history.
 */
export async function logTicketEvent(params: {
  ticket_id: string;
  guild_id: string;
  actor_id: string;
  actor_tag: string;
  event_type: string;
  event_data?: Record<string, any>;
}) {
  const id = `evt_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
  const payload: Record<string, any> = {
    id,
    ticket_id: params.ticket_id,
    guild_id: params.guild_id,
    actor_id: params.actor_id,
    actor_tag: params.actor_tag,
    event_type: params.event_type,
    event_data: JSON.stringify(params.event_data || {}),
  };
  return TicketEvent.create(payload);
}

/**
 * Retrieves full chronological activity history for a ticket.
 */
export async function getTicketEvents(ticketId: string) {
  const where: Record<string, any> = { ticket_id: ticketId };
  const records = await TicketEvent.findAll({
    where,
    order: [["created_at", "ASC"]],
  });
  return records.map((r: any) => {
    const raw = typeof r.toJSON === "function" ? r.toJSON() : r;
    let eventData: Record<string, any> = {};
    try {
      eventData = typeof raw.event_data === "string" ? JSON.parse(raw.event_data) : raw.event_data || {};
    } catch {
      eventData = {};
    }
    return {
      ...raw,
      event_data: eventData,
    };
  });
}

/**
 * Adds a private internal staff note.
 */
export async function addTicketNote(params: {
  ticket_id: string;
  guild_id: string;
  author_id: string;
  author_tag: string;
  content: string;
}) {
  const id = `not_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
  const payload: Record<string, any> = {
    id,
    ticket_id: params.ticket_id,
    guild_id: params.guild_id,
    author_id: params.author_id,
    author_tag: params.author_tag,
    content: params.content.trim(),
  };
  const note = await TicketNote.create(payload);
  await logTicketEvent({
    ticket_id: params.ticket_id,
    guild_id: params.guild_id,
    actor_id: params.author_id,
    actor_tag: params.author_tag,
    event_type: "note_added",
    event_data: { note_id: id },
  });
  return typeof note.toJSON === "function" ? note.toJSON() : note;
}

/**
 * Retrieves all staff notes for a ticket.
 */
export async function getTicketNotes(ticketId: string) {
  const where: Record<string, any> = { ticket_id: ticketId };
  const notes = await TicketNote.findAll({
    where,
    order: [["created_at", "DESC"]],
  });
  return notes.map((n: any) => (typeof n.toJSON === "function" ? n.toJSON() : n));
}

/**
 * Deletes an internal staff note.
 */
export async function deleteTicketNote(noteId: string, ticketId: string, actorId: string, actorTag: string, guildId: string) {
  const where: Record<string, any> = { id: noteId, ticket_id: ticketId };
  await TicketNote.destroy({ where });
  await logTicketEvent({
    ticket_id: ticketId,
    guild_id: guildId,
    actor_id: actorId,
    actor_tag: actorTag,
    event_type: "note_deleted",
    event_data: { note_id: noteId },
  });
}

/**
 * Assigns or reassigns staff responsibility for a ticket.
 */
export async function assignTicketStaff(params: {
  ticket_id: string;
  guild_id: string;
  staff_id: string;
  staff_tag: string;
  assigned_by: string;
  assigned_by_tag: string;
}) {
  // Mark previous assignments unassigned
  const unassignWhere: Record<string, any> = {
    ticket_id: params.ticket_id,
    unassigned_at: null,
  };
  const unassignUpdates: Record<string, any> = {
    unassigned_at: new Date().toISOString(),
  };
  await TicketAssignment.update(unassignUpdates, { where: unassignWhere });

  // Create new assignment
  const id = `asg_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
  const payload: Record<string, any> = {
    id,
    ticket_id: params.ticket_id,
    guild_id: params.guild_id,
    staff_id: params.staff_id,
    staff_tag: params.staff_tag,
    assigned_by: params.assigned_by,
    assigned_by_tag: params.assigned_by_tag,
    assigned_at: new Date().toISOString(),
  };
  await TicketAssignment.create(payload);

  // Update ticket record
  const ticketWhere: Record<string, any> = { id: params.ticket_id };
  const ticketUpdates: Record<string, any> = {
    assigned_to: params.staff_id,
    assigned_to_tag: params.staff_tag,
    status: "claimed",
    claimed_by: params.staff_id,
    claimed_by_tag: params.staff_tag,
    first_response_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  await Ticket.update(ticketUpdates, { where: ticketWhere });
  await recordSlaFirstResponse(params.ticket_id).catch(() => null);

  // Log activity
  await logTicketEvent({
    ticket_id: params.ticket_id,
    guild_id: params.guild_id,
    actor_id: params.assigned_by,
    actor_tag: params.assigned_by_tag,
    event_type: "staff_assigned",
    event_data: { staff_id: params.staff_id, staff_tag: params.staff_tag },
  });
}

/**
 * Unassigns staff from a ticket.
 */
export async function unassignTicketStaff(ticketId: string, actorId: string, actorTag: string, guildId: string) {
  const where: Record<string, any> = { ticket_id: ticketId, unassigned_at: null };
  const updates: Record<string, any> = { unassigned_at: new Date().toISOString() };
  await TicketAssignment.update(updates, { where });

  const ticketWhere: Record<string, any> = { id: ticketId };
  const ticketUpdates: Record<string, any> = {
    assigned_to: null,
    assigned_to_tag: null,
    claimed_by: null,
    claimed_by_tag: null,
    status: "open",
    updated_at: new Date().toISOString(),
  };
  await Ticket.update(ticketUpdates, { where: ticketWhere });

  await logTicketEvent({
    ticket_id: ticketId,
    guild_id: guildId,
    actor_id: actorId,
    actor_tag: actorTag,
    event_type: "staff_unassigned",
  });
}

/**
 * Initializes SLA tracking on a ticket based on priority.
 */
export async function initTicketSla(params: {
  ticket_id: string;
  guild_id: string;
  priority: string;
  first_response_hours?: number;
  resolution_hours?: number;
}) {
  const priority = params.priority || "normal";
  // Default SLA targets per priority:
  // low: 24h response, 72h resolution
  // normal: 6h response, 24h resolution
  // high: 1h response, 8h resolution
  // urgent: 15m (0.25h) response, 2h resolution
  const responseHours =
    params.first_response_hours ??
    (priority === "urgent" ? 0.25 : priority === "high" ? 1 : priority === "low" ? 24 : 6);
  const resolutionHours =
    params.resolution_hours ??
    (priority === "urgent" ? 2 : priority === "high" ? 8 : priority === "low" ? 72 : 24);

  const now = Date.now();
  const firstDeadline = new Date(now + responseHours * 3600 * 1000).toISOString();
  const resDeadline = new Date(now + resolutionHours * 3600 * 1000).toISOString();

  const id = `sla_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
  const payload: Record<string, any> = {
    id,
    ticket_id: params.ticket_id,
    guild_id: params.guild_id,
    priority,
    first_response_deadline: firstDeadline,
    resolution_deadline: resDeadline,
    is_breached: false,
  };

  // Upsert SLA
  const where: Record<string, any> = { ticket_id: params.ticket_id };
  const existing = await TicketSla.findOne({ where });
  if (existing) {
    await TicketSla.update(payload, { where });
  } else {
    await TicketSla.create(payload);
  }

  // Schedule persistent SLA check job
  await scheduleTicketJob({
    guild_id: params.guild_id,
    ticket_id: params.ticket_id,
    job_type: "sla_check",
    payload: { priority, firstDeadline, resDeadline },
    run_at: firstDeadline,
  });
}

/**
 * Records staff first response timestamp.
 */
export async function recordSlaFirstResponse(ticketId: string) {
  const where: Record<string, any> = { ticket_id: ticketId, first_response_at: null };
  const now = new Date().toISOString();
  const updates: Record<string, any> = { first_response_at: now };
  await TicketSla.update(updates, { where });

  const ticketWhere: Record<string, any> = { id: ticketId, first_response_at: null };
  await Ticket.update(updates, { where: ticketWhere });
}

/**
 * Records ticket resolution timestamp and calculates if SLA was breached.
 */
export async function recordSlaResolved(ticketId: string) {
  const now = new Date().toISOString();
  const where: Record<string, any> = { ticket_id: ticketId };
  const slaRecord = await TicketSla.findOne({ where });

  const updates: Record<string, any> = { resolved_at: now };
  if (slaRecord && slaRecord.resolution_deadline && new Date(now) > new Date(slaRecord.resolution_deadline)) {
    updates.is_breached = true;
    updates.breached_at = slaRecord.resolution_deadline;
  }
  await TicketSla.update(updates, { where });

  const ticketWhere: Record<string, any> = { id: ticketId };
  await Ticket.update({ resolved_at: now, updated_at: now }, { where: ticketWhere });
}

/**
 * Schedules a persistent DB-backed job. Survives crashes and restarts.
 */
export async function scheduleTicketJob(params: {
  guild_id: string;
  ticket_id?: string;
  job_type: string;
  payload?: Record<string, any>;
  run_at: Date | string;
}) {
  const id = `job_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
  const runAtIso = typeof params.run_at === "string" ? params.run_at : params.run_at.toISOString();
  const payload: Record<string, any> = {
    id,
    guild_id: params.guild_id,
    ticket_id: params.ticket_id || null,
    job_type: params.job_type,
    payload: JSON.stringify(params.payload || {}),
    run_at: runAtIso,
    status: "pending",
    attempts: 0,
  };
  return TicketJob.create(payload);
}

/**
 * Fetches pending jobs due for execution.
 */
export async function getPendingTicketJobs() {
  const now = new Date().toISOString();
  const where: Record<string, any> = {
    status: "pending",
    run_at: { [Op.lte]: now },
  };
  const jobs = await TicketJob.findAll({
    where,
    limit: 50,
    order: [["run_at", "ASC"]],
  });
  return jobs.map((j: any) => {
    const raw = typeof j.toJSON === "function" ? j.toJSON() : j;
    let payload: Record<string, any> = {};
    try {
      payload = typeof raw.payload === "string" ? JSON.parse(raw.payload) : raw.payload || {};
    } catch {
      payload = {};
    }
    return { ...raw, payload };
  });
}

/**
 * Atomically claims a pending ticket job for execution to prevent race conditions.
 * Returns true if this worker successfully acquired the job lock, false otherwise.
 */
export async function claimTicketJob(jobId: string): Promise<boolean> {
  const where: Record<string, any> = { id: jobId, status: "pending" };
  const updates: Record<string, any> = {
    status: "processing",
    updated_at: new Date().toISOString(),
  };
  const [affected] = await TicketJob.update(updates, { where });
  return affected > 0;
}

/**
 * Marks a scheduled job as completed.
 */
export async function completeTicketJob(jobId: string) {
  const where: Record<string, any> = { id: jobId };
  const updates: Record<string, any> = {
    status: "completed",
    updated_at: new Date().toISOString(),
  };
  await TicketJob.update(updates, { where });
}

/**
 * Marks a scheduled job as failed and increments retry attempts.
 */
export async function failTicketJob(jobId: string, error: string, retryDelayMinutes = 5) {
  const where: Record<string, any> = { id: jobId };
  const job = await TicketJob.findOne({ where });
  const attempts = ((job as any)?.attempts || 0) + 1;
  const status = attempts >= 3 ? "failed" : "pending";
  const nextRunAt = new Date(Date.now() + retryDelayMinutes * 60 * 1000).toISOString();

  const updates: Record<string, any> = {
    status,
    attempts,
    last_error: error.slice(0, 500),
    run_at: status === "pending" ? nextRunAt : (job as any)?.run_at,
    updated_at: new Date().toISOString(),
  };
  await TicketJob.update(updates, { where });
}

/**
 * Records customer satisfaction rating & feedback.
 */
export async function submitTicketFeedback(params: {
  ticket_id: string;
  guild_id: string;
  user_id: string;
  user_tag: string;
  rating: number; // 1 to 5
  comment?: string;
}) {
  const id = `fdb_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
  const payload: Record<string, any> = {
    id,
    ticket_id: params.ticket_id,
    guild_id: params.guild_id,
    user_id: params.user_id,
    user_tag: params.user_tag,
    rating: Math.max(1, Math.min(5, Number(params.rating || 5))),
    comment: params.comment ? params.comment.trim() : null,
  };
  const existingFeedback = await TicketFeedback.findOne({
    where: { ticket_id: params.ticket_id, user_id: params.user_id },
  });
  if (existingFeedback) {
    await existingFeedback.update({
      rating: payload.rating,
      comment: payload.comment,
      updated_at: new Date().toISOString(),
    });
  } else {
    await TicketFeedback.create(payload);
  }

  const ticketWhere: Record<string, any> = { id: params.ticket_id };
  const ticketUpdates: Record<string, any> = {
    feedback_rating: payload.rating,
    feedback_comment: payload.comment,
  };
  await Ticket.update(ticketUpdates, { where: ticketWhere });

  await logTicketEvent({
    ticket_id: params.ticket_id,
    guild_id: params.guild_id,
    actor_id: params.user_id,
    actor_tag: params.user_tag,
    event_type: "feedback_submitted",
    event_data: { rating: payload.rating, has_comment: Boolean(payload.comment) },
  });
}

/**
 * Computes support performance analytics.
 */
export async function getTicketAnalytics(guildId: string) {
  const gId = String(guildId);
  const where: Record<string, any> = { guild_id: gId };

  const allTickets = await Ticket.findAll({ where });
  const total = allTickets.length;

  let open = 0;
  let claimed = 0;
  let waitingUser = 0;
  let onHold = 0;
  let escalated = 0;
  let resolved = 0;
  let reopened = 0;
  let closed = 0;

  const staffWorkload = new Map<string, { tag: string; count: number; resolved: number }>();
  let totalRatingSum = 0;
  let totalRatingCount = 0;
  let responseTimes: number[] = [];
  let resolutionTimes: number[] = [];

  for (const t of allTickets) {
    const raw = typeof t.toJSON === "function" ? t.toJSON() : t;
    const status = raw.status || "open";

    if (status === "open") open++;
    else if (status === "claimed") claimed++;
    else if (status === "waiting_user") waitingUser++;
    else if (status === "on_hold") onHold++;
    else if (status === "escalated") escalated++;
    else if (status === "resolved") resolved++;
    else if (status === "reopened") reopened++;
    else if (status === "closed") closed++;

    if (raw.claimed_by) {
      const existing = staffWorkload.get(raw.claimed_by) || {
        tag: raw.claimed_by_tag || raw.claimed_by,
        count: 0,
        resolved: 0,
      };
      existing.count++;
      if (status === "resolved" || status === "closed") {
        existing.resolved++;
      }
      staffWorkload.set(raw.claimed_by, existing);
    }

    if (raw.feedback_rating) {
      totalRatingSum += Number(raw.feedback_rating);
      totalRatingCount++;
    }

    if (raw.created_at && raw.first_response_at) {
      const diff = new Date(raw.first_response_at).getTime() - new Date(raw.created_at).getTime();
      if (diff > 0) responseTimes.push(diff);
    }

    if (raw.created_at && raw.resolved_at) {
      const diff = new Date(raw.resolved_at).getTime() - new Date(raw.created_at).getTime();
      if (diff > 0) resolutionTimes.push(diff);
    }
  }

  // Calculate averages
  const avgResponseTimeMs = responseTimes.length > 0 ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 0;
  const avgResolutionTimeMs = resolutionTimes.length > 0 ? resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length : 0;
  const csatScore = totalRatingCount > 0 ? Number((totalRatingSum / totalRatingCount).toFixed(2)) : 5.0;

  const staffLeaderboard = Array.from(staffWorkload.entries()).map(([staffId, data]) => ({
    staffId,
    tag: data.tag,
    totalAssigned: data.count,
    totalResolved: data.resolved,
  })).sort((a, b) => b.totalResolved - a.totalResolved);

  return {
    total,
    open,
    claimed,
    waitingUser,
    onHold,
    escalated,
    resolved,
    reopened,
    closed,
    csatScore,
    totalRatings: totalRatingCount,
    avgResponseMinutes: Math.round(avgResponseTimeMs / 60000),
    avgResolutionHours: Number((avgResolutionTimeMs / 3600000).toFixed(1)),
    staffLeaderboard,
  };
}
