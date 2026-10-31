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
import { EMOJIS } from "../core/emojis.js";
import {
  getTicketConfig,
  getTicketPanel,
  createTicket,
  getTicketById,
  getTicketByChannel,
  getUserOpenTicketsCount,
  updateTicket,
  type ReasonCategoryItem,
} from "../db/helpers/tickets.js";
import { Ticket } from "../db/models/index.js";
import { getWarnings } from "../db/helpers/warnings.js";
import { logger } from "../utils/logger.js";
import { sendModLog } from "../utils/modLog.js";

const activeTicketActions = new Set<string>();

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

      if (cat.emoji) {
        opt.setEmoji(cat.emoji);
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

    if (panel.button_emoji) {
      button.setEmoji(panel.button_emoji);
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
  const channelName = `ticket-${formattedNum}`;

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
    .setFooter({ text: "Use the controls below to manage this ticket." })
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

  return { ticket: newTicket, channel: ticketChannel };
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
    });

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

    return updated;
  } finally {
    activeTicketActions.delete(ticketId);
  }
}

/**
 * Compiles a clean HTML transcript from a text channel.
 */
export async function generateHtmlTranscript(channel: TextChannel, ticket: any): Promise<string> {
  const messages = await channel.messages.fetch({ limit: 100 }).catch(() => null);
  const messageList = messages ? Array.from(messages.values()).reverse() : [];

  const escapeHtml = (str: string) =>
    str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  const messageRows = messageList.map((msg) => {
    const avatar = msg.author.displayAvatarURL({ size: 64 }) || "https://cdn.discordapp.com/embed/avatars/0.png";
    const time = msg.createdAt.toLocaleString();
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
            <span class="author-name">${escapeHtml(msg.author.tag)}</span>
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
  const channel = ticket.channel_id
    ? ((await guild.channels.fetch(ticket.channel_id).catch(() => null)) as TextChannel | null)
    : null;

  let transcriptHtml = "";
  let transcriptAttachment: AttachmentBuilder | null = null;

  if (channel && channel.isTextBased()) {
    transcriptHtml = await generateHtmlTranscript(channel, ticket);
    transcriptAttachment = new AttachmentBuilder(Buffer.from(transcriptHtml, "utf-8"), {
      name: `transcript-ticket-${ticket.ticket_number}.html`,
    });
  }

  // Update DB status
  const updatedTicket = await updateTicket(ticketId, {
    status: "closed",
    closed_by: closedByMember?.id || "System",
    closed_by_tag: closedByMember?.user?.tag || "System",
    close_reason: reason || "No reason provided",
    closed_at: new Date().toISOString(),
  });

  // Post to Transcript Channel if configured
  if (config.transcript_channel_id && transcriptAttachment) {
    const transcriptChannel = (await guild.channels.fetch(config.transcript_channel_id).catch(() => null)) as TextChannel | null;
    if (transcriptChannel && transcriptChannel.isTextBased()) {
      const logEmbed = makeEmbed({
        title: `📁 Ticket Closed #${ticket.ticket_number}`,
        description: `Ticket **#${ticket.ticket_number}** has been resolved and archived.`,
        color: "#64748B",
        fields: [
          { name: "Opened By", value: `<@${ticket.user_id}> (\`${ticket.user_tag}\`)`, inline: true },
          { name: "Closed By", value: `<@${closedByMember.id}> (\`${closedByMember.user.tag}\`)`, inline: true },
          { name: "Department", value: ticket.category_name || "General Support", inline: true },
          { name: "Close Reason", value: reason || "No reason specified", inline: false },
        ],
        footer: `Ticket ID: ${ticket.id}`,
      });

      await transcriptChannel.send({
        embeds: [logEmbed],
        files: [transcriptAttachment],
      }).catch((err: any) => logger.warn("[TICKET TRANSCRIPT LOG ERROR]:", err.message));
    }
  }

  // Send DM to opener
  const openerUser = await client.users.fetch(ticket.user_id).catch(() => null);
  if (openerUser && transcriptAttachment) {
    const dmEmbed = makeEmbed({
      title: `Your Ticket #${ticket.ticket_number} has been closed`,
      description: `Your support ticket in **${guild.name}** was resolved.\nA copy of your chat transcript is attached below for your records.`,
      color: "#6366F1",
      fields: [
        { name: "Reason", value: reason || "Resolved", inline: true },
        { name: "Closed By", value: closedByMember.user.tag, inline: true },
      ],
    });

    await openerUser.send({
      embeds: [dmEmbed],
      files: [transcriptAttachment],
    }).catch(() => null); // Ignore DM disabled errors
  }

  // Countdown & Delete Channel
  if (channel) {
    await channel.send({
      embeds: [
        makeEmbed({
          title: "Ticket Closed",
          description: `🔒 This ticket has been closed by <@${closedByMember.id}>.\n*Channel will be deleted automatically in 5 seconds...*`,
          color: "#EF4444",
        }),
      ],
    });

    setTimeout(async () => {
      await channel.delete("Ticket closed").catch(() => null);
    }, 5000);
  }

  return updatedTicket;
} finally {
  activeTicketActions.delete(ticketId);
}
}
