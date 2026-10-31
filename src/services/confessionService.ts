import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  type Guild,
  type GuildMember,
  type TextChannel,
} from "discord.js";
import { makeEmbed, COLORS } from "../core/embeds.js";
import { EMOJIS } from "../core/emojis.js";
import {
  getConfessionConfig,
  getConfessionByNumber,
  updateConfessionStatus,
} from "../db/helpers/confessions.js";
import { logger } from "../utils/logger.js";

/**
 * Checks whether a guild member has permission to approve or reject confessions.
 * Allowed if:
 * 1. Server Owner or Administrator permission.
 * 2. Holds one of the configured reviewer roles in `reviewer_role_ids`.
 */
export function canMemberReviewConfession(member: GuildMember | any, config: any): boolean {
  if (!member) return false;
  if (member.id === member.guild?.ownerId) return true;
  if (member.permissions?.has(PermissionFlagsBits.Administrator)) return true;

  const reviewerRoles: string[] = config.reviewer_role_ids || [];
  if (reviewerRoles.length === 0) {
    // If no specific reviewer roles are configured, fall back to ManageMessages or ManageGuild
    return (
      member.permissions?.has(PermissionFlagsBits.ManageGuild) ||
      member.permissions?.has(PermissionFlagsBits.ManageMessages)
    );
  }

  return member.roles?.cache?.some((r: any) => reviewerRoles.includes(r.id)) || false;
}

/**
 * Posts an approved confession to the public confession channel.
 */
export async function postPublicConfession(
  client: any,
  guild: Guild,
  confession: any,
  config: any
) {
  if (!config.channel_id) {
    throw new Error("Public confession channel is not configured.");
  }

  const channel = (await guild.channels.fetch(config.channel_id).catch(() => null)) as TextChannel | null;
  if (!channel || !channel.isTextBased()) {
    throw new Error("Configured confession channel was not found or is inaccessible.");
  }

  const heartEmoji = EMOJIS.get("heart") || "💌";
  const num = confession.confession_number;

  const embed = makeEmbed({
    title: `${heartEmoji} Confession #${num}`,
    description: confession.content,
    color: "#EC4899", // Vibrant rose/pink
    footer: `Confession #${num} • Submit yours with /confess`,
  });

  if (!confession.is_anonymous) {
    embed.setAuthor({
      name: confession.user_tag || "Server Member",
    });
  } else {
    embed.setAuthor({
      name: "Anonymous Confession",
    });
  }

  if (confession.image_url) {
    embed.setImage(confession.image_url);
  }

  // Quick Action Button to submit confession
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("confess_open_modal")
      .setLabel("Submit Confession")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("💌")
  );

  const sentMessage = await channel.send({
    embeds: [embed],
    components: [row],
  });

  // Auto-thread for discussions
  if (config.auto_thread && typeof sentMessage.startThread === "function") {
    try {
      await sentMessage.startThread({
        name: `💬 Confession #${num} Discussion`,
        autoArchiveDuration: 1440, // 24 hours
      });
    } catch (err: any) {
      logger.warn(`[CONFESSION THREAD] Could not create thread for #${num}:`, err.message);
    }
  }

  // Update confession record with public message and channel ID
  await updateConfessionStatus(guild.id, num, {
    status: "approved",
    channel_id: channel.id,
    message_id: sentMessage.id,
  });

  return sentMessage;
}

/**
 * Sends a pending confession to the staff review channel.
 */
export async function sendReviewConfession(
  client: any,
  guild: Guild,
  confession: any,
  config: any
) {
  if (!config.review_channel_id) {
    throw new Error("Staff review channel is not configured.");
  }

  const reviewChannel = (await guild.channels.fetch(config.review_channel_id).catch(() => null)) as TextChannel | null;
  if (!reviewChannel || !reviewChannel.isTextBased()) {
    throw new Error("Staff review channel was not found or is inaccessible.");
  }

  const num = confession.confession_number;
  const modEmoji = EMOJIS.get("moderation") || "🛡️";

  let desc = `### ${modEmoji} Pending Review: Confession #${num}\n\n`;
  desc += `> ${confession.content.split("\n").join("\n> ")}\n\n`;

  if (config.show_author_in_review) {
    desc += `**Author:** \`${confession.user_tag}\` (<@${confession.user_id}>) \`[ID: ${confession.user_id}]\`\n`;
  } else {
    desc += `**Author:** *Anonymous (Hidden by server configuration)*\n`;
  }

  desc += `**Public Anonymity:** ${confession.is_anonymous ? "🔒 Yes (Anonymous)" : "👤 No (Public Name Display)"}\n`;
  desc += `**Status:** ⏳ Pending Review\n`;

  const embed = makeEmbed({
    title: "Confession Moderation Queue",
    description: desc,
    color: "#F59E0B", // Amber warning
    footer: `Confession #${num} • Any authorized staff member may review`,
  });

  if (confession.image_url) {
    embed.setImage(confession.image_url);
  }

  const successEmoji = EMOJIS.get("success") || "✅";
  const failEmoji = EMOJIS.get("fail") || "❌";

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`confess_approve:${num}`)
      .setLabel("Approve & Publish")
      .setStyle(ButtonStyle.Success)
      .setEmoji(successEmoji),
    new ButtonBuilder()
      .setCustomId(`confess_reject:${num}`)
      .setLabel("Reject")
      .setStyle(ButtonStyle.Danger)
      .setEmoji(failEmoji)
  );

  const sentMessage = await reviewChannel.send({
    embeds: [embed],
    components: [row],
  });

  await updateConfessionStatus(guild.id, num, {
    review_message_id: sentMessage.id,
  });

  return sentMessage;
}
