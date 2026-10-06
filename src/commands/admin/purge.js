import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed } from "../../core/embeds.js";
import { EMOJIS } from "../../core/emojis.js";
import { sendModLog } from "../../utils/modLog.js";

const MAX_PURGE = 1000;
const MAX_SCAN = 5000;
const MAX_OLD_DELETES = 25; // Safe cap for individual deletion of >14d messages to prevent rate-limit freezes

// Helper to standardise short-lived ephemeral replies
async function _reply(ctx, title, description, level = "ERROR") {
  const emojiKey = level.toLowerCase();
  const systemEmoji = EMOJIS.get(emojiKey) || EMOJIS.get("warning") || "";
  const formattedDescription = systemEmoji ? `${systemEmoji} ${description}`.trim() : description;

  const embed = makeEmbed({
    title,
    description: formattedDescription,
    level,
  });

  return await ctx.reply({ embeds: [embed], ephemeral: true }).catch(() => null);
}

const slashBuilder = new SlashCommandBuilder()
  .setName("purge")
  .setDescription("Bulk delete up to 1000 messages from the current channel")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
  .setDMPermission(false)
  .addIntegerOption((opt) =>
    opt
      .setName("amount")
      .setDescription(`Number of messages to delete (1-${MAX_PURGE})`)
      .setRequired(true)
      .setMinValue(1)
      .setMaxValue(MAX_PURGE)
  )
  .addUserOption((opt) =>
    opt.setName("user").setDescription("Filter messages by specific user").setRequired(false)
  );

export default createCommand({
  name: "purge",
  description: "Bulk delete up to 1000 messages from the current channel.",
  category: "Admin",
  usage: "<amount> [user]",
  examples: [
    "/purge amount:20",
    "/purge amount:50 user:@Spammer",
  ],
  slashOnly: true,
  modOnly: true,
  requiredPermission: PermissionFlagsBits.ManageMessages,
  slashBuilder,

  async execute(ctx) {
    if (!ctx.isInteraction) return;

    await ctx.defer({ ephemeral: true });
    const { channel, guild, client, user } = ctx;

    if (!guild) {
      return await _reply(ctx, "Command Error", "This command can only be used in a server.", "ERROR");
    }

    if (!channel || !channel.isTextBased?.() || typeof channel.bulkDelete !== "function") {
      return await _reply(ctx, "Invalid Channel", "Cannot purge messages in this channel type.", "ERROR");
    }

    if (channel.isThread?.() && channel.archived) {
      return await _reply(ctx, "Thread Archived", "Cannot purge messages in an archived thread.", "ERROR");
    }

    // Bot Permission Checks
    const botMember = guild.members.me || (await guild.members.fetchMe().catch(() => null));
    if (!botMember) {
      return await _reply(ctx, "Error", "Could not verify bot permissions in this guild.", "ERROR");
    }

    const botPermissions = channel.permissionsFor(botMember);
    if (!botPermissions) {
      return await _reply(ctx, "Error", "Could not determine channel permissions for the bot.", "ERROR");
    }

    if (!botPermissions.has(PermissionFlagsBits.ManageMessages)) {
      return await _reply(ctx, "Missing Permissions", "I need the **Manage Messages** permission in this channel.", "ERROR");
    }

    if (!botPermissions.has(PermissionFlagsBits.ReadMessageHistory)) {
      return await _reply(
        ctx,
        "Missing Permissions",
        "I need the **Read Message History** permission in this channel to scan messages for deletion.",
        "ERROR"
      );
    }

    // Resolve Amount & Target User
    const rawAmount = ctx.interaction.options?.getInteger?.("amount") ?? ctx.options?.amount;
    const amount = parseInt(rawAmount, 10);

    if (isNaN(amount) || amount < 1 || amount > MAX_PURGE) {
      return await _reply(
        ctx,
        "Invalid Amount",
        `Amount must be a number between 1 and ${MAX_PURGE}.`,
        "WARNING"
      );
    }

    let targetUser = ctx.interaction.options?.getUser?.("user") || null;
    if (!targetUser && ctx.options?.user) {
      const targetId = typeof ctx.options.user === "string" ? ctx.options.user : ctx.options.user?.id;
      if (targetId) {
        targetUser = await client.users.fetch(targetId).catch(() => null);
      }
    }

    // ---------------------------------------------------------
    // Collect Messages to Delete
    // ---------------------------------------------------------
    const messagesToDelete = [];
    const scanLimit = targetUser ? MAX_SCAN : Math.min(amount + 50, MAX_SCAN);

    let lastId = undefined;
    let fetched = 0;

    while (messagesToDelete.length < amount && fetched < scanLimit) {
      const fetchAmount = Math.min(100, scanLimit - fetched);
      if (fetchAmount <= 0) break;

      const batch = await channel.messages.fetch({ limit: fetchAmount, before: lastId }).catch(() => null);
      if (!batch || batch.size === 0) break;

      fetched += batch.size;
      lastId = batch.last().id;

      for (const msg of batch.values()) {
        if (messagesToDelete.length >= amount) break;

        // Exclude pinned messages
        if (msg.pinned) continue;
        // Exclude if filtered by specific user
        if (targetUser && msg.author.id !== targetUser.id) continue;

        messagesToDelete.push(msg);
      }

      // If fewer messages returned than requested, reached beginning of channel
      if (batch.size < fetchAmount) break;
    }

    if (messagesToDelete.length === 0) {
      return await _reply(ctx, "Purge Complete", "No messages matched your criteria to delete.", "INFO");
    }

    // ---------------------------------------------------------
    // Delete Messages (Handling 14-day limit)
    // ---------------------------------------------------------
    const now = Date.now();
    const fourteenDaysMs = 14 * 24 * 60 * 60 * 1000;
    const young = [];
    const old = [];

    for (const msg of messagesToDelete) {
      if (now - msg.createdTimestamp < fourteenDaysMs) {
        young.push(msg);
      } else {
        old.push(msg);
      }
    }

    let deletedCount = 0;

    // Delete messages younger than 14 days in bulk chunks (max 100 per API call)
    for (let i = 0; i < young.length; i += 100) {
      const chunk = young.slice(i, i + 100);
      try {
        if (chunk.length === 1) {
          // Discord bulk-delete API returns 400 Bad Request for an array of 1 message.
          // Single messages must be deleted individually.
          await chunk[0].delete();
          deletedCount++;
        } else {
          const deleted = await channel.bulkDelete(chunk, true);
          deletedCount += deleted?.size ?? chunk.length;
        }
      } catch (err) {
        console.error("[PURGE BULK DELETE ERROR]:", err);
        // Fallback: attempt individual deletes for the failed chunk if small
        if (chunk.length <= 5) {
          for (const m of chunk) {
            try {
              await m.delete();
              deletedCount++;
            } catch (_) {}
          }
        }
      }

      // 1000ms delay between consecutive bulk-delete requests to respect Discord rate limits
      if (i + 100 < young.length) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    // Delete older messages one-by-one up to MAX_OLD_DELETES
    let oldDeleted = 0;
    let skippedOldCount = 0;

    if (old.length > 0) {
      const toDeleteIndividually = old.slice(0, MAX_OLD_DELETES);
      skippedOldCount = old.length - toDeleteIndividually.length;

      for (const msg of toDeleteIndividually) {
        try {
          await msg.delete();
          deletedCount++;
          oldDeleted++;
          // Rate-limit safe delay (1000ms per individual message delete)
          await new Promise((r) => setTimeout(r, 1000));
        } catch (err) {
          // Message might already be deleted or missing permissions
        }
      }
    }

    // ---------------------------------------------------------
    // Response & Mod Log
    // ---------------------------------------------------------
    const targetString = targetUser ? `from <@${targetUser.id}>` : "from this channel";
    const successIcon = EMOJIS.get("success") || "✅";
    const warningIcon = EMOJIS.get("warning") || "⚠️";

    let replyDescription = `${successIcon} Successfully deleted **${deletedCount}** messages ${targetString}.`;
    if (skippedOldCount > 0) {
      replyDescription += `\n\n${warningIcon} *${skippedOldCount} messages older than 14 days were skipped due to Discord bulk-delete limitations.*`;
    }

    await _reply(ctx, "Messages Purged", replyDescription, "SUCCESS");

    try {
      await sendModLog({
        guild,
        category: "PURGE",
        title: "Channel Message Purge",
        description: `Purged **${deletedCount}** messages in <#${channel.id}>.`,
        level: "SUCCESS",
        actor: user,
        target: targetUser || null,
        extraFields: {
          Channel: `<#${channel.id}> (\`${channel.id}\`)`,
          Requested: `${amount} messages`,
          Deleted: `${deletedCount} messages`,
          ...(skippedOldCount > 0 ? { "Skipped (>14d)": `${skippedOldCount} messages` } : {}),
        },
      });
    } catch (e) {
      // Mod log failure is non-fatal
    }
  },
});
