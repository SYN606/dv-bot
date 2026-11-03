import { ChannelType, GuildMember, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed } from "../../core/embeds.js";
import { EMOJIS } from "../../core/emojis.js";
import { sendModLog } from "../../utils/modLog.js";

const slashBuilder = new SlashCommandBuilder()
  .setName("moveall")
  .setDescription("Move all members from one voice channel to another")
  .setDefaultMemberPermissions(PermissionFlagsBits.MoveMembers)
  .setDMPermission(false)
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

async function resolveVoiceChannel(guild: any, query: any) {
  if (!query) return null;
  const cleaned = String(query).replace(/[<#>]/g, "").trim();
  let ch = guild.channels.cache.get(cleaned);
  if (!ch && /^\d+$/.test(cleaned)) {
    ch = await guild.channels.fetch(cleaned).catch(() => null);
  }
  if (!ch) {
    ch = guild.channels.cache.find(
      (c: any) => c.isVoiceBased?.() && c.name.toLowerCase() === cleaned.toLowerCase()
    );
  }
  return ch && ch.isVoiceBased?.() ? ch : null;
}

export default createCommand({
  name: "moveall",
  description: "Move all members from one voice channel to another",
  category: "Voice",
  usage: "<source> [target]",
  examples: [
    "/moveall target:#Gaming",
    "/moveall source:#Lobby target:#Gaming",
    "dvmoveall #Lobby #Gaming",
  ],
  modOnly: true,
  requiredPermission: PermissionFlagsBits.MoveMembers,
  slashBuilder,

  async execute(ctx) {
    const { guild, member } = ctx;
    if (!guild) return;

    // Defer early to avoid 3-second interaction expiration
    await ctx.defer({ ephemeral: false });

    let invokerMember = member instanceof GuildMember ? member : null;
    if (!invokerMember && guild.members.fetch) {
      invokerMember = await guild.members.fetch(ctx.user.id).catch(() => null);
    }
    const currentVcId = invokerMember?.voice?.channelId || member?.voice?.channelId;

    const currentVc = currentVcId
      ? guild.channels.cache.get(currentVcId) || (await guild.channels.fetch(currentVcId).catch(() => null))
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
    const botMember = guild.members.me || (await guild.members.fetchMe().catch(() => null));
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
    const checkMember = invokerMember || member;
    if (checkMember && !target.permissionsFor(checkMember)?.has(PermissionFlagsBits.Connect)) {
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

    const activeMembers = [...source.members.values()].filter(
      (m: any) => m && m.voice?.channelId === source.id
    );

    if (activeMembers.length === 0) {
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

    const startTime = Date.now();
    let movedCount = 0;
    let failedCount = 0;
    const queue = [...activeMembers];
    const CONCURRENCY = 10;
    const workerCount = Math.min(CONCURRENCY, activeMembers.length);
    const auditReason = `Bulk moved by ${ctx.user.tag || ctx.user.username} (${ctx.user.id})`.slice(0, 512);

    async function moveWorker() {
      while (queue.length > 0) {
        const m = queue.shift();
        if (!m || m.voice?.channelId !== source.id) {
          continue;
        }
        try {
          await m.voice.setChannel(target, auditReason);
          movedCount++;
        } catch {
          failedCount++;
        }
        await new Promise((r) => setTimeout(r, 60)); // Safe pacing to respect voice member PATCH limits
      }
    }

    const workers = Array.from({ length: workerCount }, () => moveWorker());
    await Promise.all(workers);

    const elapsedSeconds = ((Date.now() - startTime) / 1000).toFixed(1);

    if (movedCount === 0) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Move Failed",
            description: `${EMOJIS.get("fail") || "❌"} Could not move any members to **${target.name}**. Please verify bot permissions and voice limits.`,
            level: "ERROR",
          }),
        ],
      });
    }

    // Send Mod Log for audit tracking (non-blocking)
    try {
      await sendModLog({
        guild,
        category: "VOICE",
        title: "Bulk Voice Move",
        description: `<@${ctx.user.id}> moved **${movedCount}** members from **${source.name}** to **${target.name}** in **${elapsedSeconds}s**.`,
        level: "INFO",
        actor: ctx.user,
        extraFields: {
          "Source Channel": `${source.name} (\`${source.id}\`)`,
          "Target Channel": `${target.name} (\`${target.id}\`)`,
          "Members Moved": `${movedCount}/${activeMembers.length}`,
          "Duration": `${elapsedSeconds}s`,
        },
      });
    } catch (_) {}

    const failedText = failedCount > 0 ? ` (${failedCount} failed or disconnected)` : "";
    return await ctx.reply({
      embeds: [
        makeEmbed({
          title: "Members Moved",
          description: `${EMOJIS.get("success") || "✅"} Fast-moved **${movedCount}** of **${activeMembers.length}** members from **${source.name}** to **${target.name}** in **${elapsedSeconds}s**${failedText}.`,
          level: failedCount > 0 ? "WARNING" : "SUCCESS",
        }),
      ],
    });
  },
});
