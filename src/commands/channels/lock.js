import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed } from "../../core/embeds.js";
import { EMOJIS } from "../../core/emojis.js";
import { sendModLog } from "../../utils/modLog.js";

const unlockTimers = new Map(); // channelId -> Timeout

function parseDuration(str) {
  if (!str) return null;
  const match = String(str).trim().match(/^(\d+)\s*([smhd])$/i);
  if (!match) return null;
  const num = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  if (isNaN(num) || num <= 0) return null;
  switch (unit) {
    case "s": return num;
    case "m": return num * 60;
    case "h": return num * 3600;
    case "d": return num * 86400;
    default: return null;
  }
}

const slashBuilder = new SlashCommandBuilder()
  .setName("lock")
  .setDescription("Lock or unlock a channel for regular members")
  .addStringOption((opt) =>
    opt
      .setName("action")
      .setDescription("Lock or Unlock")
      .setRequired(true)
      .addChoices(
        { name: "Lock", value: "lock" },
        { name: "Unlock", value: "unlock" }
      )
  )
  .addStringOption((opt) =>
    opt.setName("duration").setDescription("Optional timed duration (e.g. 10m, 1h, 1d)").setRequired(false)
  )
  .addChannelOption((opt) => opt.setName("channel").setDescription("Target channel").setRequired(false));

export default createCommand({
  name: "lock",
  description: "Lock or unlock a channel for regular members",
  category: "Channels",
  aliases: ["unlock"],
  modOnly: true,
  requiredPermission: PermissionFlagsBits.ManageChannels,
  slashBuilder,

  async execute(ctx) {
    const { guild, channel, user } = ctx;
    if (!guild) return;

    let action = ctx.options.action || "lock";
    if (ctx.command.name === "unlock" || ctx.options._args?.[0]?.toLowerCase() === "unlock") {
      action = "unlock";
    }

    const targetChannel = ctx.options.channel ? guild.channels.cache.get(ctx.options.channel) || channel : channel;
    const everyoneRole = guild.roles.everyone;

    if (action === "lock") {
      // Check for duration arg
      let durationStr = ctx.options.duration;
      if (!durationStr && ctx.options._args) {
        for (const arg of ctx.options._args) {
          if (parseDuration(arg)) {
            durationStr = arg;
            break;
          }
        }
      }

      const durationSeconds = parseDuration(durationStr);

      await targetChannel.permissionOverwrites.edit(everyoneRole, {
        SendMessages: false,
        AddReactions: false,
      });

      // Clear any existing timer
      if (unlockTimers.has(targetChannel.id)) {
        clearTimeout(unlockTimers.get(targetChannel.id));
        unlockTimers.delete(targetChannel.id);
      }

      let expiryDesc = "";
      if (durationSeconds) {
        const expiryUnix = Math.floor(Date.now() / 1000) + durationSeconds;
        expiryDesc = `\n\n${EMOJIS.get("arrow_point") || "➡️"} **Auto-Unlocks:** <t:${expiryUnix}:R>`;

        const timer = setTimeout(async () => {
          unlockTimers.delete(targetChannel.id);
          try {
            await targetChannel.permissionOverwrites.edit(everyoneRole, {
              SendMessages: null,
              AddReactions: null,
            });

            await targetChannel.send({
              embeds: [
                makeEmbed({
                  title: "Channel Unlocked",
                  description: `${EMOJIS.get("success") || "🔓"} Temporary lockdown expired. Normal messaging has been restored.`,
                  level: "SUCCESS",
                }),
              ],
            }).catch(() => {});
          } catch (err) {
            console.error("[AUTO UNLOCK ERROR]:", err);
          }
        }, durationSeconds * 1000);

        unlockTimers.set(targetChannel.id, timer);
      }

      await sendModLog({
        guild,
        category: "MODERATION",
        title: "Channel Locked",
        description: `Channel ${targetChannel} was locked by <@${user.id}>.${durationSeconds ? ` (Duration: ${durationStr})` : ""}`,
        level: "WARNING",
        actor: user,
      });

      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Channel Locked",
            description: `${EMOJIS.get("warning") || "🔒"} ${targetChannel} has been **locked**. Non-staff members cannot send messages.${expiryDesc}`,
            level: "WARNING",
          }),
        ],
      });
    }

    if (action === "unlock") {
      if (unlockTimers.has(targetChannel.id)) {
        clearTimeout(unlockTimers.get(targetChannel.id));
        unlockTimers.delete(targetChannel.id);
      }

      await targetChannel.permissionOverwrites.edit(everyoneRole, {
        SendMessages: null,
        AddReactions: null,
      });

      await sendModLog({
        guild,
        category: "MODERATION",
        title: "Channel Unlocked",
        description: `Channel ${targetChannel} was unlocked by <@${user.id}>.`,
        level: "INFO",
        actor: user,
      });

      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Channel Unlocked",
            description: `${EMOJIS.get("success") || "🔓"} ${targetChannel} has been **unlocked**. Normal messaging has been restored.`,
            level: "SUCCESS",
          }),
        ],
      });
    }
  },
});
