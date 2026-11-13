import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  MessageFlags,
  PermissionFlagsBits,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  AttachmentBuilder,
  type Guild,
  type GuildMember,
  type TextChannel,
  type User,
} from "discord.js";
import { makeEmbed, COLORS } from "../core/embeds.js";
import {
  getTicketConfig,
  getTicketPanel,
  createTicket,
  getTicketById,
  getTicketByChannel,
  getUserOpenTicketsCount,
  updateTicket,
  setTicketVoiceChannel,
  formatTicketChannelName,
  registerActiveTicketChannel,
  unregisterActiveTicketChannel,
  markTicketResponseReceived,
  isTicketChannelActive,
  isTicketAwaitingResponse,
  initTicketSla,
  recordSlaFirstResponse,
  logTicketEvent,
  type ReasonCategoryItem,
} from "../db/helpers/tickets.js";
import { Ticket } from "../db/models/index.js";
import { getWarnings } from "../db/helpers/warnings.js";
import { logger } from "../utils/logger.js";

export const activeTicketActions = new Set<string>();
export const inFlightTicketCreations = new Set<string>();

/**
 * Sends a real-time event log embed to the configured Ticket Logging Channel.
 */
export async function sendTicketLog(guild: Guild, embed: any) {
  try {
    const config = await getTicketConfig(guild.id);
    if (!config?.logging_channel_id) return;
    const logChannel = (await guild.channels.fetch(config.logging_channel_id).catch(() => null)) as TextChannel | null;
    if (!logChannel || !logChannel.isTextBased()) return;
    await logChannel.send({ embeds: [embed] }).catch((err) => logger.warn("[TICKET LOG SEND ERROR]:", err.message));
  } catch (err: any) {
    logger.warn("[TICKET LOG ERROR]:", err.message);
  }
}

/**
 * Checks whether a guild member has permission to moderate/claim/close tickets.
 */
export function canMemberManageTickets(member: GuildMember | any, config: any, categoryRoleIds?: string[]): boolean {
  if (!member) return false;
  if (member.id === member.guild?.ownerId) return true;
  if (member.permissions?.has(PermissionFlagsBits.Administrator)) return true;
  if (member.permissions?.has(PermissionFlagsBits.ManageGuild)) return true;
  if (member.permissions?.has(PermissionFlagsBits.ManageChannels)) return true;

  const rolesToCheck = new Set<string>([
    ...(categoryRoleIds || []),
    ...(config?.support_role_ids || []),
  ]);

  if (rolesToCheck.size === 0) {
    return member.permissions?.has(PermissionFlagsBits.ManageMessages) || false;
  }

  return member.roles?.cache?.some((r: any) => rolesToCheck.has(r.id)) || false;
}

function resolveComponentEmoji(raw?: string): any {
  if (!raw || typeof raw !== "string") return null;
  const trimmed = raw.trim();
  const match = trimmed.match(/^<(a)?:([a-zA-Z0-9_]+):([0-9]+)>$/);
  if (match) {
    return {
      animated: Boolean(match[1]),
      name: match[2],
      id: match[3],
    };
  }
  return trimmed || null;
}

/**
 * Deploys or updates the ticket panel message in the designated channel.
 */
export async function deployTicketPanel(client: any, guild: Guild, panel: any) {
  if (!panel.channel_id) {
    throw new Error("Target channel is not configured for this panel.");
  }

  const channel = (await guild.channels.fetch(panel.channel_id).catch(() => null)) as TextChannel | null;
  if (!channel || !channel.isTextBased()) {
    throw new Error("Specified channel was not found or is not a text channel.");
  }

  const me = guild.members.me || (await guild.members.fetchMe().catch(() => null));
  if (me) {
    const perms = channel.permissionsFor(me);
    if (!perms || !perms.has(PermissionFlagsBits.ViewChannel) || !perms.has(PermissionFlagsBits.SendMessages) || !perms.has(PermissionFlagsBits.EmbedLinks)) {
      throw new Error(`Bot lacks permissions to send embeds in <#${channel.id}>.`);
    }
  }

  const panelEmbed = new EmbedBuilder()
    .setTitle(panel.title || "🎫 Support Tickets")
    .setDescription(panel.description || "Need assistance? Click a button or select a department below.")
    .setColor(panel.color || "#6366F1")
    .setFooter({ text: `${guild.name} • Ticket System`, iconURL: guild.iconURL() || undefined })
    .setTimestamp();

  if (panel.image_url) {
    panelEmbed.setImage(panel.image_url);
  }

  const components: any[] = [];

  // If Reason Categories are enabled and present, build a Select Menu
  if (panel.enable_reason_categories && Array.isArray(panel.reason_categories) && panel.reason_categories.length > 0) {
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`ticket_select_reason:${panel.id}`)
      .setPlaceholder(panel.select_placeholder || "Select a ticket reason / category...")
      .setMinValues(1)
      .setMaxValues(1);

    for (const cat of panel.reason_categories.slice(0, 25)) {
      const opt = new StringSelectMenuOptionBuilder()
        .setLabel(cat.label.slice(0, 100))
        .setValue(cat.id.slice(0, 100))
        .setDescription((cat.description || "Open a ticket in this category").slice(0, 100));

      const resolvedEmoji = resolveComponentEmoji(cat.emoji);
      if (resolvedEmoji) {
        opt.setEmoji(resolvedEmoji);
      }
      selectMenu.addOptions(opt);
    }

    components.push(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu));
  } else {
    // Single Button Mode
    let btnStyle = ButtonStyle.Primary;
    const lowerStyle = (panel.button_style || "primary").toLowerCase();
    if (lowerStyle === "secondary") btnStyle = ButtonStyle.Secondary;
    else if (lowerStyle === "success") btnStyle = ButtonStyle.Success;
    else if (lowerStyle === "danger") btnStyle = ButtonStyle.Danger;

    const button = new ButtonBuilder()
      .setCustomId(`ticket_open_direct:${panel.id}`)
      .setLabel(panel.button_text || "Open Ticket")
      .setStyle(btnStyle);

    const resolvedBtnEmoji = resolveComponentEmoji(panel.button_emoji);
    if (resolvedBtnEmoji) {
      button.setEmoji(resolvedBtnEmoji);
    }

    components.push(new ActionRowBuilder<ButtonBuilder>().addComponents(button));
  }

  let sentMessage;
  if (panel.message_id) {
    sentMessage = await channel.messages.fetch(panel.message_id).catch(() => null);
    if (sentMessage) {
      sentMessage = await sentMessage.edit({ embeds: [panelEmbed], components });
    }
  }

  if (!sentMessage) {
    sentMessage = await channel.send({ embeds: [panelEmbed], components });
  }

  return sentMessage;
}

/**
 * Deletes all posted messages associated with a ticket panel from Discord.
 */
export async function deleteTicketPanelMessages(client: any, guild: Guild, panel: any) {
  if (!panel || !panel.channel_id) return;

  try {
    const channel = (await guild.channels.fetch(panel.channel_id).catch(() => null)) as TextChannel | null;
    if (!channel || !channel.isTextBased()) return;

    // 1. Delete recorded message if present
    if (panel.message_id) {
      const msg = await channel.messages.fetch(panel.message_id).catch(() => null);
      if (msg) {
        await msg.delete().catch(() => null);
      }
    }

    // 2. Scan recent messages in channel to clean up any duplicate or desynced posts of this panel
    const recent = await channel.messages.fetch({ limit: 50 }).catch(() => null);
    if (recent) {
      const targetPanelId = String(panel.id);
      for (const [, msg] of recent) {
        if (msg.author.id === client.user.id && msg.id !== panel.message_id) {
          const hasPanelComponent = msg.components?.some((row: any) =>
            row.components?.some((comp: any) =>
              (comp.customId && comp.customId.includes(targetPanelId)) ||
              (comp.data?.custom_id && comp.data.custom_id.includes(targetPanelId))
            )
          );
          if (hasPanelComponent) {
            await msg.delete().catch(() => null);
          }
        }
      }
    }
  } catch (err) {
    logger.warn(`[TICKET PANEL] Failed to delete Discord messages for panel ${panel?.id}:`, err);
  }
}

/**
 * Spawns a new ticket channel for a user.
 */
export async function openTicketChannel(params: {
  client: any;
  guild: Guild;
  member: GuildMember;
  panel: any;
  reasonCategory?: ReasonCategoryItem | null;
  reasonDetails?: string | null;
}) {
  const { client, guild, member, panel, reasonCategory, reasonDetails } = params;
  const userLockKey = `${guild.id}:${member.id}`;
  if (inFlightTicketCreations.has(userLockKey)) {
    throw new Error("A ticket is already being opened for your account. Please wait.");
  }
  inFlightTicketCreations.add(userLockKey);

  try {
    const config = await getTicketConfig(guild.id);

  if (!config.enabled) {
    throw new Error("The ticket system is currently inactive on this server.");
  }

  const openCount = await getUserOpenTicketsCount(guild.id, member.id);
  if (openCount >= config.max_tickets_per_user) {
    throw new Error(`You already have ${openCount} open ticket(s). The limit is ${config.max_tickets_per_user}. Please resolve existing tickets before opening a new one.`);
  }

  // Determine parent category ID
  const targetCategoryId = reasonCategory?.category_id || config.category_id || undefined;

  // Determine support roles
  const supportRoles = new Set<string>([
    ...(reasonCategory?.role_ids || []),
    ...(config.support_role_ids || []),
  ]);

  // Create Ticket Record in DB first
  const categoryLabel = reasonCategory?.label || "General Support";
  const newTicket = await createTicket({
    guild_id: guild.id,
    user_id: member.id,
    user_tag: member.user.tag,
    panel_id: panel?.id || null,
    category_name: categoryLabel,
    reason: reasonDetails || null,
  });

  const formattedNum = String(newTicket.ticket_number).padStart(4, "0");
  const pattern = panel?.channel_name_pattern || config.channel_name_pattern || "ticket-{number}";
  const channelName = formatTicketChannelName({
    pattern,
    ticketNumber: newTicket.ticket_number,
    username: member.user.username,
    displayName: member.displayName,
    categoryName: categoryLabel,
  });

  // Build Permission Overwrites
  const permissionOverwrites: any[] = [
    {
      id: guild.roles.everyone.id,
      deny: [PermissionFlagsBits.ViewChannel],
    },
    {
      id: member.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.EmbedLinks,
        PermissionFlagsBits.ReadMessageHistory,
      ],
    },
  ];

  const me = guild.members.me || (await guild.members.fetchMe().catch(() => null));
  if (me) {
    permissionOverwrites.push({
      id: me.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ManageChannels,
        PermissionFlagsBits.ManageMessages,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.EmbedLinks,
        PermissionFlagsBits.ReadMessageHistory,
      ],
    });
  }

  for (const roleId of supportRoles) {
    const roleExists = guild.roles.cache.has(roleId);
    if (roleExists) {
      permissionOverwrites.push({
        id: roleId,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.EmbedLinks,
          PermissionFlagsBits.ReadMessageHistory,
        ],
      });
    }
  }

  // Create Channel with robust error handling to prevent orphaned ghost tickets
  let ticketChannel: TextChannel;
  try {
    ticketChannel = (await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: targetCategoryId,
      topic: `Ticket #${newTicket.ticket_number} • Opened by ${member.user.tag} (${member.id}) • Category: ${categoryLabel}`,
      permissionOverwrites,
    })) as TextChannel;
  } catch (err: any) {
    logger.error("[TICKET CHANNEL CREATE ERROR]:", err);
    await Ticket.destroy({ where: { id: newTicket.id } }).catch(() => null);
    throw new Error(
      `Failed to create ticket channel: ${err.message || "Unknown error"}. Check bot permissions or server channel limits.`
    );
  }

  // Link channel ID to ticket in DB
  await updateTicket(newTicket.id, { channel_id: ticketChannel.id });
  registerActiveTicketChannel(ticketChannel.id, true);

  // Initialize SLA tracking & event logging
  await initTicketSla({
    ticket_id: newTicket.id,
    guild_id: guild.id,
    priority: "normal",
  }).catch(() => null);

  await logTicketEvent({
    ticket_id: newTicket.id,
    guild_id: guild.id,
    actor_id: member.id,
    actor_tag: member.user.tag,
    event_type: "ticket_created",
    event_data: {
      category: categoryLabel,
      channel_id: ticketChannel.id,
      panel_id: panel?.id || null,
    },
  }).catch(() => null);

  // Compile User Intel Dossier
  let warningCount = 0;
  try {
    const userWarnings = await getWarnings(guild.id, member.id);
    warningCount = userWarnings ? userWarnings.length : 0;
  } catch (_) {}

  const accountCreated = Math.floor(member.user.createdTimestamp / 1000);
  const serverJoined = Math.floor((member.joinedTimestamp || Date.now()) / 1000);

  const welcomeEmbed = new EmbedBuilder()
    .setTitle(`🎫 Ticket #${formattedNum} • ${categoryLabel}`)
    .setDescription(
      `Hello <@${member.id}>, welcome to your private support channel.\n` +
      `Our team has been notified and will assist you shortly. Please provide any additional screenshots or information you have.`
    )
    .setColor("#6366F1")
    .addFields(
      {
        name: "📁 Department / Reason",
        value: `${reasonCategory?.emoji ? `${reasonCategory.emoji} ` : ""}${categoryLabel}`,
        inline: true,
      },
      {
        name: "👤 Opened By",
        value: `<@${member.id}> (\`${member.user.tag}\`)`,
        inline: true,
      },
      {
        name: "🛡️ Member Security Dossier",
        value: `• Created: <t:${accountCreated}:R>\n• Joined: <t:${serverJoined}:R>\n• Active Warnings: **${warningCount}**`,
        inline: false,
      }
    )
    .setFooter({ text: "Commands: /ticket add • /ticket remove • /ticket claim • /ticket close" })
    .setTimestamp();

  if (reasonDetails) {
    welcomeEmbed.addFields({
      name: "📝 Provided Details / Inquiries",
      value: reasonDetails.slice(0, 1024),
      inline: false,
    });
  }

  const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`ticket_claim:${newTicket.id}`)
      .setLabel("Claim Ticket")
      .setStyle(ButtonStyle.Success)
      .setEmoji("🙋"),
    new ButtonBuilder()
      .setCustomId(`ticket_create_vc:${newTicket.id}`)
      .setLabel("Create VC")
      .setStyle(ButtonStyle.Primary)
      .setEmoji("🎙️"),
    new ButtonBuilder()
      .setCustomId(`ticket_close_request:${newTicket.id}`)
      .setLabel("Close Ticket")
      .setStyle(ButtonStyle.Danger)
      .setEmoji("🔒")
  );

  // Send opening notification
  const roleMentions = Array.from(supportRoles).map((r) => `<@&${r}>`).join(" ");
  const notificationContent = `${roleMentions ? `${roleMentions} ` : ""}<@${member.id}>`;

  await ticketChannel.send({
    content: notificationContent,
    embeds: [welcomeEmbed],
    components: [actionRow],
  });

  // Real-time audit log
  await sendTicketLog(
    guild,
    makeEmbed({
      title: `🎫 Ticket Created #${formattedNum}`,
      description: `A new ticket channel <#${ticketChannel.id}> has been opened.`,
      color: "#6366F1",
      fields: [
        { name: "👤 Opened By", value: `<@${member.id}> (\`${member.user.tag}\`)`, inline: true },
        { name: "📁 Department", value: `${reasonCategory?.emoji ? `${reasonCategory.emoji} ` : ""}${categoryLabel}`, inline: true },
        { name: "🏷️ Channel", value: `<#${ticketChannel.id}>`, inline: true },
        ...(reasonDetails ? [{ name: "📝 Details / Reason", value: reasonDetails.slice(0, 1024), inline: false }] : []),
      ],
      footer: `Ticket ID: ${newTicket.id}`,
    })
  );

    return { ticket: newTicket, channel: ticketChannel };
  } finally {
    inFlightTicketCreations.delete(userLockKey);
  }
}

/**
 * Claims a ticket for a staff member.
 */
export async function claimTicket(params: {
  guild: Guild;
  member: GuildMember;
  ticketId: string;
}) {
  const { guild, member, ticketId } = params;

  if (activeTicketActions.has(ticketId)) {
    throw new Error("An action is already being processed on this ticket.");
  }
  activeTicketActions.add(ticketId);

  try {
    const ticket = await getTicketById(ticketId);
    if (!ticket) throw new Error("Ticket record not found.");

    if (ticket.status === "claimed") {
      throw new Error(`This ticket is already claimed by <@${ticket.claimed_by}>.`);
    }

    if (ticket.status === "closed") {
      throw new Error("This ticket is already closed.");
    }

    const updated = await updateTicket(ticketId, {
      status: "claimed",
      claimed_by: member.id,
      claimed_by_tag: member.user.tag,
      first_response_at: ticket.first_response_at || new Date().toISOString(),
    });
    await recordSlaFirstResponse(ticketId).catch(() => null);
    if (ticket.channel_id) {
      markTicketResponseReceived(ticket.channel_id);
    }

    if (ticket.channel_id) {
      const channel = (await guild.channels.fetch(ticket.channel_id).catch(() => null)) as TextChannel | null;
      if (channel) {
        await channel.send({
          embeds: [
            makeEmbed({
              title: "Ticket Claimed",
              description: `🙋 **${member.user.tag}** (<@${member.id}>) has claimed this ticket and will be handling your request.`,
              color: "#10B981",
            }),
          ],
        });
      }
    }

    // Real-time audit log
    await sendTicketLog(
      guild,
      makeEmbed({
        title: `🙋 Ticket Claimed #${ticket.ticket_number}`,
        description: `Ticket **#${ticket.ticket_number}** was claimed by <@${member.id}>.`,
        color: "#10B981",
        fields: [
          { name: "Staff Member", value: `<@${member.id}> (\`${member.user.tag}\`)`, inline: true },
          { name: "Ticket Opener", value: `<@${ticket.user_id}> (\`${ticket.user_tag}\`)`, inline: true },
          ...(ticket.channel_id ? [{ name: "Channel", value: `<#${ticket.channel_id}>`, inline: true }] : []),
        ],
        footer: `Ticket ID: ${ticket.id}`,
      })
    );

    return updated;
  } finally {
    activeTicketActions.delete(ticketId);
  }
}

/**
 * Compiles a clean HTML transcript from a text channel.
 */
export async function generateHtmlTranscript(channel: TextChannel, ticket: any): Promise<string> {
  const allMessages: any[] = [];
  let lastId: string | undefined = undefined;

  // Paginated message fetching up to 10 batches (1,000 messages)
  for (let i = 0; i < 10; i++) {
    const fetchOptions: any = { limit: 100 };
    if (lastId) fetchOptions.before = lastId;
    const batch = await channel.messages.fetch(fetchOptions).catch(() => null);
    if (!batch || batch.size === 0) break;
    allMessages.push(...Array.from(batch.values()));
    lastId = batch.last()?.id;
    if (batch.size < 100) break;
  }

  const messageList = allMessages.reverse();

  const escapeHtml = (str: string) =>
    str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  const messageRows = messageList.map((msg) => {
    const avatar = msg.author?.displayAvatarURL?.({ size: 64 }) || "https://cdn.discordapp.com/embed/avatars/0.png";
    const time = msg.createdAt ? msg.createdAt.toLocaleString() : new Date().toLocaleString();
    const authorTag = msg.author?.tag || msg.author?.username || "Unknown User";
    const content = escapeHtml(msg.content || "");
    const embedsHtml = msg.embeds.map((emb) => `
      <div class="embed-box" style="border-left: 4px solid ${emb.hexColor || '#6366f1'};">
        ${emb.title ? `<div class="embed-title">${escapeHtml(emb.title)}</div>` : ""}
        ${emb.description ? `<div class="embed-desc">${escapeHtml(emb.description)}</div>` : ""}
      </div>
    `).join("");

    const attachmentsHtml = msg.attachments.map((att) => `
      <div class="attachment"><a href="${att.url}" target="_blank" rel="noreferrer">📎 ${escapeHtml(att.name)}</a></div>
    `).join("");

    return `
      <div class="message-card">
        <img class="avatar" src="${avatar}" alt="" />
        <div class="msg-body">
          <div class="msg-header">
            <span class="author-name">${escapeHtml(authorTag)}</span>
            <span class="timestamp">${time}</span>
          </div>
          <div class="msg-content">${content}</div>
          ${embedsHtml}
          ${attachmentsHtml}
        </div>
      </div>
    `;
  }).join("");

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Ticket #${ticket.ticket_number} Transcript • DV-BOT</title>
      <style>
        body { background: #0a0d16; color: #e2e8f0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 24px; }
        .header { border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 16px; margin-bottom: 24px; }
        .header h1 { margin: 0 0 8px 0; font-size: 20px; color: #fff; }
        .header p { margin: 0; font-size: 13px; color: #94a3b8; }
        .message-card { display: flex; gap: 12px; margin-bottom: 16px; padding: 10px; border-radius: 8px; background: rgba(255,255,255,0.02); }
        .avatar { width: 40px; height: 40px; border-radius: 50%; }
        .msg-body { flex: 1; }
        .msg-header { display: flex; gap: 8px; align-items: baseline; margin-bottom: 4px; }
        .author-name { font-weight: 600; font-size: 14px; color: #f8fafc; }
        .timestamp { font-size: 11px; color: #64748b; }
        .msg-content { font-size: 13px; line-height: 1.5; color: #cbd5e1; word-break: break-word; }
        .embed-box { margin-top: 8px; padding: 8px 12px; background: rgba(0,0,0,0.3); border-radius: 4px; }
        .embed-title { font-weight: 600; margin-bottom: 4px; color: #fff; }
        .embed-desc { font-size: 12px; color: #94a3b8; }
        .attachment { margin-top: 6px; font-size: 12px; }
        .attachment a { color: #818cf8; text-decoration: none; }
        .attachment a:hover { text-decoration: underline; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Ticket #${ticket.ticket_number} • ${escapeHtml(ticket.category_name || "Support")}</h1>
        <p>Opened by: ${escapeHtml(ticket.user_tag)} (${ticket.user_id}) | Closed: ${new Date().toLocaleString()}</p>
      </div>
      <div class="chat-log">
        ${messageRows || "<p style='color:#64748b;'>No messages recorded in this ticket.</p>"}
      </div>
    </body>
    </html>
  `;
}

/**
 * Closes and archives a ticket channel, posts transcript, and cleans up.
 */
export async function closeTicket(params: {
  client: any;
  guild: Guild;
  ticketId: string;
  closedByMember: GuildMember | any;
  reason?: string | null;
}) {
  const { client, guild, ticketId, closedByMember, reason } = params;

  if (activeTicketActions.has(ticketId)) {
    throw new Error("This ticket is already in the process of being closed.");
  }
  activeTicketActions.add(ticketId);

  try {
    const ticket = await getTicketById(ticketId);
    if (!ticket) throw new Error("Ticket record not found.");

    if (ticket.status === "closed") {
      throw new Error("This ticket is already closed.");
    }

  const config = await getTicketConfig(guild.id);
  const closedById = closedByMember?.id || "system";
  const closedByTag = closedByMember?.user?.tag || closedByMember?.user?.username || closedByMember?.tag || "System";
  const closedByMention = closedByMember?.id ? `<@${closedByMember.id}>` : "System";

  const channel = ticket.channel_id
    ? ((await guild.channels.fetch(ticket.channel_id).catch(() => null)) as TextChannel | null)
    : null;

  const shouldSaveTranscripts = config.save_transcripts !== false;
  let transcriptHtml = "";
  let transcriptAttachment: AttachmentBuilder | null = null;

  if (shouldSaveTranscripts && channel && channel.isTextBased()) {
    transcriptHtml = await generateHtmlTranscript(channel, ticket);
    transcriptAttachment = new AttachmentBuilder(Buffer.from(transcriptHtml, "utf-8"), {
      name: `transcript-ticket-${ticket.ticket_number}.html`,
    });
  }

  // Update DB status
  const updatedTicket = await updateTicket(ticketId, {
    status: "closed",
    closed_by: closedById,
    closed_by_tag: closedByTag,
    close_reason: reason || "No reason provided",
    closed_at: new Date().toISOString(),
  });

  if (ticket.channel_id) {
    unregisterActiveTicketChannel(ticket.channel_id);
  }

  // Automatically cleanup voice channel if one was active for this ticket
  if (ticket.voice_channel_id) {
    await deleteTicketVoiceChannel({
      guild,
      ticket,
      actor: { id: closedById, tag: closedByTag },
    }).catch(() => null);
  }

  // Post to Transcript Channel if configured and enabled
  if (config.transcript_channel_id) {
    const transcriptChannel = (await guild.channels.fetch(config.transcript_channel_id).catch(() => null)) as TextChannel | null;
    if (transcriptChannel && transcriptChannel.isTextBased()) {
      const logEmbed = makeEmbed({
        title: `📁 Ticket Closed #${ticket.ticket_number}`,
        description: `Ticket **#${ticket.ticket_number}** has been resolved and archived.${!shouldSaveTranscripts ? " *(Transcripts disabled in settings)*" : ""}`,
        color: "#64748B",
        fields: [
          { name: "Opened By", value: `<@${ticket.user_id}> (\`${ticket.user_tag}\`)`, inline: true },
          { name: "Closed By", value: `${closedByMention} (\`${closedByTag}\`)`, inline: true },
          { name: "Department", value: ticket.category_name || "General Support", inline: true },
          { name: "Close Reason", value: reason || "No reason specified", inline: false },
        ],
        footer: `Ticket ID: ${ticket.id}`,
      });

      const sendOptions: any = { embeds: [logEmbed] };
      if (transcriptAttachment) {
        sendOptions.files = [transcriptAttachment];
      }
      await transcriptChannel.send(sendOptions).catch((err: any) => logger.warn("[TICKET TRANSCRIPT LOG ERROR]:", err.message));
    }
  }

  // Real-time audit log
  await sendTicketLog(
    guild,
    makeEmbed({
      title: `🔒 Ticket Closed #${ticket.ticket_number}`,
      description: `Ticket **#${ticket.ticket_number}** has been closed and archived.`,
      color: "#EF4444",
      fields: [
        {
          name: "Closed By",
          value: `${closedByMention} (\`${closedByTag}\`)`,
          inline: true,
        },
        { name: "Ticket Opener", value: `<@${ticket.user_id}> (\`${ticket.user_tag}\`)`, inline: true },
        { name: "Department", value: ticket.category_name || "General Support", inline: true },
        { name: "Close Reason", value: reason || "No reason specified", inline: false },
      ],
      footer: `Ticket ID: ${ticket.id}`,
    })
  );

  // Send DM to opener
  const openerUser = await client.users.fetch(ticket.user_id).catch(() => null);
  if (openerUser) {
    const dmEmbed = makeEmbed({
      title: `Your Ticket #${ticket.ticket_number} has been closed`,
      description: `Your support ticket in **${guild.name}** was resolved.${shouldSaveTranscripts && transcriptAttachment ? "\nA copy of your chat transcript is attached below for your records." : ""}\n\n**How was your support experience?** Rate below:`,
      color: "#6366F1",
      fields: [
        { name: "Reason", value: reason || "Resolved", inline: true },
        { name: "Closed By", value: closedByTag, inline: true },
      ],
    });

    const feedbackRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(`ticket_feedback:${ticket.id}:1`).setLabel("1 ★").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`ticket_feedback:${ticket.id}:2`).setLabel("2 ★").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`ticket_feedback:${ticket.id}:3`).setLabel("3 ★").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`ticket_feedback:${ticket.id}:4`).setLabel("4 ★").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`ticket_feedback:${ticket.id}:5`).setLabel("5 ★").setStyle(ButtonStyle.Success)
    );

    const dmOptions: any = {
      embeds: [dmEmbed],
      components: [feedbackRow],
    };
    if (shouldSaveTranscripts && transcriptAttachment) {
      dmOptions.files = [transcriptAttachment];
    }

    await openerUser.send(dmOptions).catch(() => null); // Ignore DM disabled errors
  }

  // Audit event
  await logTicketEvent({
    ticket_id: ticketId,
    guild_id: guild.id,
    actor_id: closedById,
    actor_tag: closedByTag,
    event_type: "ticket_closed",
    event_data: { reason: reason || null, transcripts_saved: shouldSaveTranscripts },
  }).catch(() => null);

  // Send Close Controls with Delete Button in Channel & lock user permissions
  if (channel) {
    if (ticket.user_id) {
      await channel.permissionOverwrites.edit(ticket.user_id, {
        SendMessages: false,
        AttachFiles: false,
      }).catch(() => null);
    }

    const closeEmbed = makeEmbed({
      title: "🔒 Support Ticket Closed",
      description: `Ticket **#${ticket.ticket_number}** has been marked closed by ${closedByMention}.${reason ? `\n\n**Close Reason:** ${reason}` : ""}\n\nStaff can permanently delete this channel, reopen the ticket, or download the transcript below.`,
      color: 0xda373c,
      footer: { text: "Click 'Delete Ticket' to remove this channel" },
    });

    const closeControlRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`ticket_delete:${ticket.id}`)
        .setLabel("Delete Ticket")
        .setStyle(ButtonStyle.Danger)
        .setEmoji("🗑️"),
      new ButtonBuilder()
        .setCustomId(`ticket_reopen:${ticket.id}`)
        .setLabel("Reopen Ticket")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("🔓"),
      new ButtonBuilder()
        .setCustomId(`ticket_transcript:${ticket.id}`)
        .setLabel("Transcript")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("📄")
    );

    await channel.send({
      embeds: [closeEmbed],
      components: [closeControlRow],
    }).catch(() => null);
  }

  return updatedTicket;
} finally {
  activeTicketActions.delete(ticketId);
}
}

/**
 * Real-time message listener handler to record staff first response on tickets.
 */
export async function handleTicketMessage(message: any) {
  try {
    if (!message.guild || message.author?.bot) return;

    // Fast-path: O(1) in-memory lookup. If this channel is not an active ticket awaiting response, exit immediately!
    if (!isTicketAwaitingResponse(message.channel?.id)) return;

    const ticket = await getTicketByChannel(message.channel.id);
    if (!ticket || ticket.status === "closed" || ticket.status === "resolved") {
      markTicketResponseReceived(message.channel.id);
      return;
    }

    // Check if first response has not yet been logged
    if (!ticket.first_response_at) {
      const isStaffOrOther = message.author.id !== ticket.user_id;
      const isClaimed = Boolean(ticket.claimed_by || ticket.status === "claimed");

      // Mark as first response if message is from staff/other, ticket is claimed, or conversation is active
      if (isStaffOrOther || isClaimed) {
        markTicketResponseReceived(message.channel.id);
        const now = new Date().toISOString();
        await Promise.allSettled([
          recordSlaFirstResponse(ticket.id),
          updateTicket(ticket.id, { first_response_at: now }),
        ]);
      }
    } else {
      markTicketResponseReceived(message.channel.id);
    }
  } catch (err: any) {
    logger.debug(`[TICKET MSG HANDLER ERROR]: ${err.message}`);
  }
}

/**
 * Creates a private, locked Voice Channel dedicated to this ticket.
 * Accessible ONLY by the ticket creator, assigned ticket helpers (support roles), and the bot.
 */
export async function createTicketVoiceChannel(params: {
  client: any;
  guild: Guild;
  member: GuildMember;
  ticket: any;
}) {
  const { guild, member, ticket } = params;

  if (ticket.status === "closed") {
    throw new Error("Cannot create a voice channel for a closed ticket.");
  }

  // Check if a voice channel is already active for this ticket
  if (ticket.voice_channel_id) {
    const existing = await guild.channels.fetch(ticket.voice_channel_id).catch(() => null);
    if (existing) {
      return { voiceChannel: existing, alreadyExists: true };
    }
  }

  const config = await getTicketConfig(guild.id);
  // Find parent category from ticket text channel or config
  const textChannel = ticket.channel_id
    ? ((await guild.channels.fetch(ticket.channel_id).catch(() => null)) as TextChannel | null)
    : null;
  const channelBaseName = textChannel?.name || `ticket-${String(ticket.ticket_number).padStart(4, "0")}`;
  const channelName = `🔊・${channelBaseName}`.slice(0, 32);
  const targetCategoryId = textChannel?.parentId || config?.category_id || undefined;

  // Determine support roles (Ticket Helpers)
  const supportRoles = new Set<string>(config?.support_role_ids || []);

  // Strict Permission Overwrites:
  // 1. @everyone: Deny ViewChannel and Connect
  const permissionOverwrites: any[] = [
    {
      id: guild.roles.everyone.id,
      deny: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.Connect,
      ],
    },
    // 2. Ticket Creator (User): Allow ViewChannel, Connect, Speak, Stream, UseVAD
    {
      id: ticket.user_id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.Connect,
        PermissionFlagsBits.Speak,
        PermissionFlagsBits.Stream,
        PermissionFlagsBits.UseVAD,
      ],
    },
  ];

  // 3. Bot Client: Full Voice Channel Management
  const me = guild.members.me || (await guild.members.fetchMe().catch(() => null));
  if (me) {
    permissionOverwrites.push({
      id: me.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.Connect,
        PermissionFlagsBits.Speak,
        PermissionFlagsBits.ManageChannels,
        PermissionFlagsBits.MoveMembers,
      ],
    });
  }

  // 4. Ticket Claimed Staff Member (if different from opener)
  if (ticket.claimed_by && ticket.claimed_by !== ticket.user_id) {
    permissionOverwrites.push({
      id: ticket.claimed_by,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.Connect,
        PermissionFlagsBits.Speak,
        PermissionFlagsBits.Stream,
        PermissionFlagsBits.UseVAD,
        PermissionFlagsBits.MuteMembers,
        PermissionFlagsBits.DeafenMembers,
        PermissionFlagsBits.MoveMembers,
      ],
    });
  }

  // 5. Support Roles (Ticket Helpers)
  for (const roleId of supportRoles) {
    if (guild.roles.cache.has(roleId)) {
      permissionOverwrites.push({
        id: roleId,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.Connect,
          PermissionFlagsBits.Speak,
          PermissionFlagsBits.Stream,
          PermissionFlagsBits.UseVAD,
          PermissionFlagsBits.MuteMembers,
          PermissionFlagsBits.DeafenMembers,
          PermissionFlagsBits.MoveMembers,
        ],
      });
    }
  }

  // Create the Guild Voice Channel
  const voiceChannel = await guild.channels.create({
    name: channelName,
    type: ChannelType.GuildVoice,
    parent: targetCategoryId,
    permissionOverwrites,
    reason: `Private voice channel for Support Ticket #${ticket.ticket_number} (Opened by ${ticket.user_tag})`,
  });

  // Link voice channel ID in DB
  await setTicketVoiceChannel(ticket.id, voiceChannel.id);

  // Log audit event
  await logTicketEvent({
    ticket_id: ticket.id,
    guild_id: guild.id,
    actor_id: member.id,
    actor_tag: member.user.tag,
    event_type: "ticket_vc_created",
    event_data: {
      voice_channel_id: voiceChannel.id,
      channel_name: channelName,
    },
  }).catch(() => null);

  return { voiceChannel, alreadyExists: false };
}

/**
 * Deletes the voice channel associated with a ticket and clears the database record.
 */
export async function deleteTicketVoiceChannel(params: {
  guild: Guild;
  ticket: any;
  actor?: { id: string; tag: string };
}) {
  const { guild, ticket, actor } = params;

  if (ticket.voice_channel_id) {
    const vc = await guild.channels.fetch(ticket.voice_channel_id).catch(() => null);
    if (vc) {
      await vc.delete("Ticket voice channel ended").catch(() => null);
    }
    await setTicketVoiceChannel(ticket.id, null);

    // Remove obsolete VC control buttons from the ticket text channel
    if (ticket.channel_id) {
      try {
        const textChannel = (await guild.channels.fetch(ticket.channel_id).catch(() => null)) as TextChannel | null;
        if (textChannel && textChannel.isTextBased()) {
          const recent = await textChannel.messages.fetch({ limit: 20 }).catch(() => null);
          if (recent) {
            const targetButtonId = `ticket_delete_vc:${ticket.id}`;
            for (const [, msg] of recent) {
              const hasVcButton = msg.components?.some((row: any) =>
                row.components?.some((comp: any) =>
                  (comp.customId && comp.customId === targetButtonId) ||
                  (comp.data?.custom_id && comp.data.custom_id === targetButtonId)
                )
              );
              if (hasVcButton) {
                await msg.edit({ components: [] }).catch(() => null);
              }
            }
          }
        }
      } catch (_) {}
    }

    if (actor) {
      await logTicketEvent({
        ticket_id: ticket.id,
        guild_id: guild.id,
        actor_id: actor.id,
        actor_tag: actor.tag,
        event_type: "ticket_vc_deleted",
        event_data: {
          voice_channel_id: ticket.voice_channel_id,
        },
      }).catch(() => null);
    }
    return true;
  }
  return false;
}
