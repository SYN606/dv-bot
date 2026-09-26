import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed } from "../../core/embeds.js";
import { EMOJIS } from "../../core/emojis.js";
import { sendModLog } from "../../utils/modLog.js";

const MAX_PURGE = 1000;
const MAX_SCAN = 5000;

// Helper to standardise short-lived replies matching python version
async function _reply(ctx, title, description, level = "ERROR", deleteAfterSecs = 8) {
  const emojiKey = level.toLowerCase();
  const systemEmoji = EMOJIS.get(emojiKey) || EMOJIS.get("warning") || "";
  const formattedDescription = systemEmoji ? `${systemEmoji} ${description}`.trim() : description;

  const embed = makeEmbed({
    title,
    description: formattedDescription,
    level
  });

  const replyOptions = { embeds: [embed] };
  if (ctx.isInteraction) {
    replyOptions.ephemeral = true;
  }

  const msg = await ctx.reply(replyOptions);

  // Auto-delete message command replies after N seconds
  if (!ctx.isInteraction && msg && deleteAfterSecs > 0) {
    setTimeout(() => {
      msg.delete().catch(() => null);
    }, deleteAfterSecs * 1000);
  }
  return msg;
}

const slashBuilder = new SlashCommandBuilder()
  .setName("purge")
  .setDescription("Bulk delete up to 1000 messages from the current channel")
  .addIntegerOption((opt) =>
    opt
      .setName("amount")
      .setDescription(`Number of messages to delete (1-${MAX_PURGE})`)
      .setRequired(true)
      .setMinValue(1)
      .setMaxValue(MAX_PURGE)
  )
  .addUserOption((opt) => opt.setName("user").setDescription("Filter messages by specific user").setRequired(false));

export default createCommand({
  name: "purge",
  description: "Cog for performing bulk message deletion in guild channels.",
  category: "Admin",
  aliases: ["clear"],
  modOnly: true,
  requiredPermission: PermissionFlagsBits.ManageMessages,
  slashBuilder,

  async execute(ctx) {
    const { channel, guild, message, client, isInteraction } = ctx;
    if (!channel || !channel.messages) {
      return await ctx.reply({ content: "Cannot purge messages in this channel type.", ephemeral: true });
    }

    // Bot Permission Check
    if (!channel.permissionsFor(guild.members.me).has(PermissionFlagsBits.ManageMessages)) {
      return await _reply(ctx, "Missing Permissions", "I need the `Manage Messages` permission in this target channel.", "ERROR");
    }

    let targetUser = null;
    let amount = undefined;

    if (isInteraction) {
      amount = parseInt(ctx.options.amount);
      if (ctx.options.user) {
        const targetId = typeof ctx.options.user === "string" ? ctx.options.user : ctx.options.user.id;
        targetUser = await client.users.fetch(targetId).catch(() => null);
      }
    } else {
      // 1. Resolve Target User from mentions or reply reference
      if (message.mentions.users.size > 0) {
        targetUser = message.mentions.users.first();
      } else if (message.reference && message.reference.messageId) {
        try {
          const refMsg = await channel.messages.fetch(message.reference.messageId);
          if (refMsg) targetUser = refMsg.author;
        } catch (e) {
          // Ignore fetch error
        }
      }

      // 2. Resolve Amount from arguments
      if (ctx.args) {
        for (const arg of ctx.args) {
          if (/^\d+$/.test(arg)) {
            amount = parseInt(arg, 10);
            break;
          }
        }
      }

      // 3. Delete invocation message
      await message.delete().catch(() => null);
    }

    if (!amount || isNaN(amount)) {
      const warningIcon = EMOJIS.get("warning") || "⚠️";
      return await _reply(
        ctx,
        "Invalid Usage",
        `${warningIcon} Correct syntax:\n• \`purge <amount>\`\n• \`purge @user <amount>\`\n• \`reply + purge <amount>\``,
        "WARNING"
      );
    }

    if (amount < 1 || amount > MAX_PURGE) {
      return await _reply(ctx, "Invalid Amount", `Amount must be between 1 and ${MAX_PURGE}.`, "WARNING");
    }

    // Acknowledge interaction quickly to prevent timeout during long scans
    if (isInteraction) {
      await ctx.defer({ ephemeral: true });
    }

    // ---------------------------------------------------------
    // Collect Messages
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
        // Exclude the command message itself (if it somehow wasn't deleted)
        if (!isInteraction && message && msg.id === message.id) continue;
        // Exclude if filtered by user
        if (targetUser && msg.author.id !== targetUser.id) continue;
        
        messagesToDelete.push(msg);
      }
    }

    if (messagesToDelete.length === 0) {
      return await _reply(ctx, "Purge Complete", "No messages matched your criteria to delete.", "INFO", 5);
    }

    // ---------------------------------------------------------
    // Delete Messages (Handling 14-day limit)
    // ---------------------------------------------------------
    const now = Date.now();
    const fourteenDays = 14 * 24 * 60 * 60 * 1000;
    const young = [];
    const old = [];

    for (const msg of messagesToDelete) {
      // Bulk delete only supports messages younger than 14 days
      if (now - msg.createdTimestamp < fourteenDays) {
        young.push(msg);
      } else {
        old.push(msg);
      }
    }

    let deletedCount = 0;

    // Delete young messages in bulk (max 100 per API call)
    for (let i = 0; i < young.length; i += 100) {
      const chunk = young.slice(i, i + 100);
      try {
        const deleted = await channel.bulkDelete(chunk, true);
        deletedCount += deleted.size;
      } catch (e) {
        // Safe fail
      }
    }

    // Delete old messages one by one with rate-limit respecting delay
    for (const msg of old) {
      try {
        await msg.delete();
        deletedCount++;
        // 350ms delay matching python equivalent
        await new Promise(r => setTimeout(r, 350));
      } catch (e) {
        // Safe fail
      }
    }

    // ---------------------------------------------------------
    // Response & Mod Log
    // ---------------------------------------------------------
    const targetString = targetUser ? `from <@${targetUser.id}>` : "from this channel";
    const successIcon = EMOJIS.get("success") || "✅";
    
    await _reply(ctx, "Messages Purged", `${successIcon} Successfully deleted **${deletedCount}** messages ${targetString}.`, "SUCCESS", 5);

    try {
      await sendModLog({
        guild,
        category: "CONFIG", // Matching Python format
        title: "Channel Clean Purge",
        description: `Bulk deleted **${deletedCount}** messages in <#${channel.id}>.`,
        level: "SUCCESS",
        actor: ctx.user,
        extraFields: {
          "Channel ID": channel.id,
          "Requested Target": String(amount),
          "Actual Deleted": String(deletedCount),
        }
      });
    } catch (e) {
      // Ignore mod log failures
    }
  }
});
