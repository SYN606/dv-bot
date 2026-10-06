import { ChannelType, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed } from "../../core/embeds.js";
import { EMOJIS } from "../../core/emojis.js";

const slashBuilder = new SlashCommandBuilder()
  .setName("drag")
  .setDescription("Move a member to a specified voice channel or your current channel")
  .addUserOption((opt) => opt.setName("user").setDescription("The member to move").setRequired(true))
  .addChannelOption((opt) => 
    opt.setName("channel")
       .setDescription("The voice channel to move them to (defaults to your channel)")
       .addChannelTypes(ChannelType.GuildVoice, ChannelType.GuildStageVoice)
       .setRequired(false)
  );

async function resolveVoiceChannel(guild, query) {
  if (!query) return null;
  const cleaned = String(query).replace(/[<#>]/g, "").trim();
  let ch = guild.channels.cache.get(cleaned);
  if (!ch && /^\d+$/.test(cleaned)) {
    ch = await guild.channels.fetch(cleaned).catch(() => null);
  }
  if (!ch) {
    ch = guild.channels.cache.find(
      (c) => c.isVoiceBased?.() && c.name.toLowerCase() === cleaned.toLowerCase()
    );
  }
  return ch && ch.isVoiceBased?.() ? ch : null;
}

export default createCommand({
  name: "drag",
  description: "Move a member to a specified voice channel or your current channel",
  category: "Voice",
  usage: "<user> [channel]",
  examples: [
    "/drag user:@User",
    "/drag user:@User channel:#Gaming",
    "dvdrag @User #Gaming",
  ],
  modOnly: true,
  requiredPermission: PermissionFlagsBits.MoveMembers,
  slashBuilder,

  async execute(ctx) {
    const { guild, member } = ctx;
    if (!guild || !member) return;

    // Resolve target user from slash option, primary argument, or mention
    const rawUser = ctx.options.user || ctx.options.primary || ctx.options._args?.[0];
    const targetUserId = typeof rawUser === "string"
      ? rawUser.replace(/[<@!>]/g, "").trim()
      : rawUser?.id;

    if (!targetUserId) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "User Required",
            description: `${EMOJIS.get("fail") || "❌"} Please specify a member to move (e.g. \`/drag user: @member\` or \`!drag @member\`).`,
            level: "ERROR",
          }),
        ],
        ephemeral: true,
      });
    }

    const targetMember = guild.members.cache.get(targetUserId) || await guild.members.fetch(targetUserId).catch(() => null);
    if (!targetMember) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Member Not Found",
            description: `${EMOJIS.get("fail") || "❌"} Could not find member <@${targetUserId}> in this server.`,
            level: "ERROR",
          }),
        ],
        ephemeral: true,
      });
    }

    if (!targetMember.voice?.channelId) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Member Not In Voice",
            description: `${EMOJIS.get("warning") || "⚠️"} <@${targetUserId}> is not connected to any voice channel.`,
            level: "WARNING",
          }),
        ],
        ephemeral: true,
      });
    }

    // Resolve target voice channel
    const rawChannel = ctx.options.channel || ctx.options._args?.[1];
    let targetChannel = null;

    if (rawChannel) {
      targetChannel = await resolveVoiceChannel(guild, typeof rawChannel === "string" ? rawChannel : rawChannel.id);
    } else if (member.voice?.channelId) {
      targetChannel = member.voice.channel || await guild.channels.fetch(member.voice.channelId).catch(() => null);
    }

    if (!targetChannel || !targetChannel.isVoiceBased?.()) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Invalid Voice Channel",
            description: `${EMOJIS.get("fail") || "❌"} You must specify a valid voice channel or be connected to one yourself.`,
            level: "ERROR",
          }),
        ],
        ephemeral: true,
      });
    }

    if (targetMember.voice.channelId === targetChannel.id) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Already Connected",
            description: `${EMOJIS.get("warning") || "⚠️"} <@${targetUserId}> is already in **${targetChannel.name}**.`,
            level: "WARNING",
          }),
        ],
        ephemeral: true,
      });
    }

    // Bot permission checks
    const botMember = guild.members.me || await guild.members.fetchMe().catch(() => null);
    if (!botMember || !botMember.permissions.has(PermissionFlagsBits.MoveMembers)) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Missing Permissions",
            description: `${EMOJIS.get("fail") || "❌"} I need the **Move Members** permission to move users between voice channels.`,
            level: "ERROR",
          }),
        ],
        ephemeral: true,
      });
    }

    if (!targetChannel.permissionsFor(botMember)?.has(PermissionFlagsBits.Connect)) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Cannot Access Target",
            description: `${EMOJIS.get("fail") || "❌"} I do not have permission to connect to **${targetChannel.name}**.`,
            level: "ERROR",
          }),
        ],
        ephemeral: true,
      });
    }

    // Invoker permission check
    if (!targetChannel.permissionsFor(member)?.has(PermissionFlagsBits.Connect)) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Access Denied",
            description: `${EMOJIS.get("fail") || "❌"} You do not have permission to connect to **${targetChannel.name}**.`,
            level: "ERROR",
          }),
        ],
        ephemeral: true,
      });
    }

    try {
      await targetMember.voice.setChannel(targetChannel);
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Member Moved",
            description: `${EMOJIS.get("success") || "✅"} Moved <@${targetUserId}> to **${targetChannel.name}**.`,
            level: "SUCCESS",
          }),
        ],
      });
    } catch (err) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Move Failed",
            description: `${EMOJIS.get("fail") || "❌"} Failed to move <@${targetUserId}>: ${err.message || "Unknown error"}.`,
            level: "ERROR",
          }),
        ],
        ephemeral: true,
      });
    }
  },
});
