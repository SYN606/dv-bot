import { ChannelType, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed } from "../../core/embeds.js";
import { EMOJIS } from "../../core/emojis.js";

const slashBuilder = new SlashCommandBuilder()
  .setName("moveall")
  .setDescription("Move all members from one voice channel to another")
  .addChannelOption((opt) =>
    opt
      .setName("source")
      .setDescription("The voice channel to move from (defaults to your current VC)")
      .addChannelTypes(ChannelType.GuildVoice, ChannelType.GuildStageVoice)
      .setRequired(false)
  )
  .addChannelOption((opt) =>
    opt
      .setName("target")
      .setDescription("The voice channel to move to (defaults to your current VC)")
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
  name: "moveall",
  description: "Move all members from one voice channel to another",
  category: "Voice",
  modOnly: true,
  requiredPermission: PermissionFlagsBits.MoveMembers,
  slashBuilder,

  async execute(ctx) {
    const { guild, member } = ctx;
    if (!guild) return;

    const currentVc = member?.voice?.channelId
      ? member.voice.channel || await guild.channels.fetch(member.voice.channelId).catch(() => null)
      : null;

    let rawSource = ctx.options.source;
    let rawTarget = ctx.options.target;

    // Handle prefix arguments (e.g. !moveall <target> OR !moveall <source> <target>)
    if (!rawSource && !rawTarget && ctx.options._args?.length > 0) {
      if (ctx.options._args.length === 1) {
        rawTarget = ctx.options._args[0];
        rawSource = currentVc?.id;
      } else {
        rawSource = ctx.options._args[0];
        rawTarget = ctx.options._args[1];
      }
    } else {
      // In slash commands: if one channel is omitted, default to current VC
      if (!rawSource && currentVc) rawSource = currentVc.id;
      if (!rawTarget && currentVc) rawTarget = currentVc.id;
    }

    if (!rawSource && !rawTarget) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Voice Channel Required",
            description: `${EMOJIS.get("fail") || "❌"} Please specify a target voice channel or join one.`,
            level: "ERROR",
          }),
        ],
        ephemeral: true,
      });
    }

    if (!rawSource) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Source Channel Required",
            description: `${EMOJIS.get("fail") || "❌"} Please specify a source voice channel or join one.`,
            level: "ERROR",
          }),
        ],
        ephemeral: true,
      });
    }

    if (!rawTarget) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Target Channel Required",
            description: `${EMOJIS.get("fail") || "❌"} Please specify a target voice channel or join one.`,
            level: "ERROR",
          }),
        ],
        ephemeral: true,
      });
    }

    const source = await resolveVoiceChannel(guild, rawSource);
    const target = await resolveVoiceChannel(guild, rawTarget);

    if (!source || !target) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Invalid Voice Channel",
            description: `${EMOJIS.get("fail") || "❌"} Could not find one or both voice channels. Please check names or IDs.`,
            level: "ERROR",
          }),
        ],
        ephemeral: true,
      });
    }

    if (source.id === target.id) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Identical Channels",
            description: `${EMOJIS.get("warning") || "⚠️"} Source and target channels are the same (**${source.name}**).`,
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

    if (!target.permissionsFor(botMember)?.has(PermissionFlagsBits.Connect)) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Cannot Access Target",
            description: `${EMOJIS.get("fail") || "❌"} I do not have permission to connect to **${target.name}**.`,
            level: "ERROR",
          }),
        ],
        ephemeral: true,
      });
    }

    // Invoker permission check
    if (member && !target.permissionsFor(member)?.has(PermissionFlagsBits.Connect)) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Access Denied",
            description: `${EMOJIS.get("fail") || "❌"} You do not have permission to connect to **${target.name}**.`,
            level: "ERROR",
          }),
        ],
        ephemeral: true,
      });
    }

    const members = [...source.members.values()];
    if (members.length === 0) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "No Members Found",
            description: `${EMOJIS.get("warning") || "⚠️"} There are no members currently connected to **${source.name}**.`,
            level: "WARNING",
          }),
        ],
        ephemeral: true,
      });
    }

    await ctx.defer();

    let movedCount = 0;
    let failedCount = 0;

    for (const m of members) {
      if (!m.voice?.channelId || m.voice.channelId !== source.id) {
        continue;
      }
      try {
        await m.voice.setChannel(target);
        movedCount++;
      } catch {
        failedCount++;
      }
      if (members.length > 1) {
        await new Promise((r) => setTimeout(r, 350));
      }
    }

    if (movedCount === 0) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Move Failed",
            description: `${EMOJIS.get("fail") || "❌"} Could not move any members to **${target.name}**. Please verify bot permissions and role hierarchy.`,
            level: "ERROR",
          }),
        ],
      });
    }

    const failedText = failedCount > 0 ? ` (${failedCount} failed or disconnected)` : "";
    return await ctx.reply({
      embeds: [
        makeEmbed({
          title: "Members Moved",
          description: `${EMOJIS.get("success") || "✅"} Moved **${movedCount}** of **${members.length}** members from **${source.name}** to **${target.name}**${failedText}.`,
          level: failedCount > 0 ? "WARNING" : "SUCCESS",
        }),
      ],
    });
  },
});
