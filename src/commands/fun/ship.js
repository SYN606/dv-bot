import { SlashCommandBuilder } from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed } from "../../core/embeds.js";

/**
 * Generate a deterministic daily compatibility score between two Discord users (0-100%).
 * Guarantees consistent daily results so friends cannot spam-roll for different numbers.
 */
function calculateShipScore(id1, id2) {
  const dateKey = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const sortedPair = [String(id1), String(id2)].sort().join(":");
  const seed = `${sortedPair}:${dateKey}`;

  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }

  return Math.abs(hash) % 101;
}

/**
 * Fuse two usernames into a cute couple ship name
 */
function generateShipName(name1, name2) {
  const clean1 = name1.replace(/[^a-zA-Z0-9]/g, "").trim() || name1.slice(0, 4);
  const clean2 = name2.replace(/[^a-zA-Z0-9]/g, "").trim() || name2.slice(0, 4);

  const half1 = clean1.slice(0, Math.max(2, Math.ceil(clean1.length / 2)));
  const half2 = clean2.slice(Math.floor(clean2.length / 2));

  return (half1 + half2).charAt(0).toUpperCase() + (half1 + half2).slice(1).toLowerCase();
}

/**
 * Render visual progress bar
 */
function createLoveBar(percent, totalBlocks = 16) {
  const filledCount = Math.round((percent / 100) * totalBlocks);
  const emptyCount = totalBlocks - filledCount;
  const bar = "█".repeat(filledCount) + "░".repeat(emptyCount);
  return `\`[${bar}]\` **${percent}%**`;
}

/**
 * Rating commentary tiers
 */
function getShipTier(percent) {
  if (percent === 100) {
    return {
      title: "💘 Cosmic Destiny & Soulmates!",
      comment: "A match written in the stars! You two possess 100% pure, unbreakable chemistry.",
      color: 0xff1493, // Deep pink
    };
  }
  if (percent >= 85) {
    return {
      title: "💍 Wedding Bells Incoming!",
      comment: "Incredible connection! You finish each other's sentences. Go ahead and make it official!",
      color: 0xff69b4, // Hot pink
    };
  }
  if (percent >= 65) {
    return {
      title: "💖 Sweet Romance & High Chemistry!",
      comment: "Definite butterflies and romantic tension. The vibes between you two are immaculate!",
      color: 0xe056fd, // Lavender pink
    };
  }
  if (percent >= 45) {
    return {
      title: "🌤️ Promising Spark!",
      comment: "There's definitely mutual interest. A casual coffee date could ignite something special.",
      color: 0xf0932b, // Amber orange
    };
  }
  if (percent >= 25) {
    return {
      title: "🌧️ Friendzone Alert!",
      comment: "Great as study buddies or gaming partners, but romance might feel a bit awkward.",
      color: 0x95afc0, // Slate
    };
  }
  return {
    title: "💔 Oil and Water Disaster!",
    comment: "Total personality clash! It's like putting pineapple on pizza with ketchup. Run away!",
    color: 0xeb4d4b, // Carmine red
  };
}

const slashBuilder = new SlashCommandBuilder()
  .setName("ship")
  .setDescription("Calculate love compatibility and couple ship score between two users")
  .addUserOption((opt) =>
    opt.setName("user1").setDescription("First user to ship").setRequired(true)
  )
  .addUserOption((opt) =>
    opt.setName("user2").setDescription("Second user to ship (defaults to yourself)").setRequired(false)
  );

export default createCommand({
  name: "ship",
  category: "Fun",
  aliases: ["shipping", "match", "lovemeter"],
  description: "Calculate love compatibility and couple ship score between two users",
  usage: "<@user1> [@user2]",
  examples: [
    "/ship user1:@Friend",
    "/ship user1:@Alice user2:@Bob",
    "dv ship @Friend",
    "dv ship @Alice @Bob",
  ],
  slashBuilder,

  async execute(ctx) {
    const { client, message, user } = ctx;

    let target1 = null;
    let target2 = null;

    // 1. Resolve from Slash Options
    if (ctx.options.user1) {
      target1 = await client.users.fetch(ctx.options.user1).catch(() => null);
      if (ctx.options.user2) {
        target2 = await client.users.fetch(ctx.options.user2).catch(() => null);
      } else {
        target2 = user;
      }
    }
    // 2. Resolve from Prefix Mentions & Arguments
    else if (message) {
      const mentions = Array.from(message.mentions.users.values());
      if (mentions.length >= 2) {
        target1 = mentions[0];
        target2 = mentions[1];
      } else if (mentions.length === 1) {
        target1 = mentions[0];
        target2 = user;
      } else if (ctx.options._args?.length > 0) {
        const idMatches = ctx.options.raw?.match(/\d{17,20}/g) || [];
        if (idMatches.length >= 2) {
          target1 = await client.users.fetch(idMatches[0]).catch(() => null);
          target2 = await client.users.fetch(idMatches[1]).catch(() => null);
        } else if (idMatches.length === 1) {
          target1 = await client.users.fetch(idMatches[0]).catch(() => null);
          target2 = user;
        }
      }
    }

    if (!target1) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Shipping Calculator",
            description: "Please mention at least one user to calculate love compatibility!\n\n**Example:** `dv ship @User` or `/ship user1:@User`",
            level: "WARNING",
          }),
        ],
        ephemeral: true,
      });
    }

    if (!target2) {
      target2 = user;
    }

    // Special Case: Self-shipping
    if (target1.id === target2.id) {
      const embed = makeEmbed({
        title: "✨ Self-Love Champion!",
        description:
          `### <@${target1.id}> × <@${target1.id}>\n\n` +
          `${createLoveBar(100)}\n\n` +
          `> *"Loving yourself is the greatest romance of all."*\n\n` +
          `**Ship Name:** **${target1.username}**\n` +
          `**Status:** 👑 **100% Unconditional Self-Worth**\n` +
          `Treat yourself to something nice today—you deserve the world!`,
        level: "PREMIUM",
        color: 0xff1493,
        thumbnail: target1.displayAvatarURL({ dynamic: true, size: 256 }),
        footer: "Daily Compatibility • Valid for today",
      });
      return await ctx.reply({ embeds: [embed] });
    }

    // Special Case: Shipping with the bot
    const isBotInvolved = target1.id === client.user.id || target2.id === client.user.id;
    if (isBotInvolved) {
      const human = target1.id === client.user.id ? target2 : target1;
      const embed = makeEmbed({
        title: "🤖 Cybernetic Best Friends!",
        description:
          `### <@${human.id}> × <@${client.user.id}>\n\n` +
          `${createLoveBar(69)}\n\n` +
          `> *I may only process silicon logic and Discord events, but you're definitely my favorite user!* 💕\n\n` +
          `**Ship Name:** **${generateShipName(human.username, client.user.username)}**\n` +
          `**Status:** 🦾 **Approved Companion**`,
        level: "PREMIUM",
        color: 0x5865f2,
        thumbnail: client.user.displayAvatarURL({ dynamic: true, size: 256 }),
        footer: "Digital Vigital • AI Affection Engine",
      });
      return await ctx.reply({ embeds: [embed] });
    }

    // Calculate score & rating
    const score = calculateShipScore(target1.id, target2.id);
    const tier = getShipTier(score);
    const shipName = generateShipName(target1.username, target2.username);

    const desc =
      `### 💕 <@${target1.id}> × <@${target2.id}>\n\n` +
      `**Couple Name:** **\`${shipName}\`**\n` +
      `**Compatibility Meter:**\n${createLoveBar(score)}\n\n` +
      `### ${tier.title}\n` +
      `> ${tier.comment}\n\n` +
      `- <@${target1.id}> (${target1.username})\n` +
      `- <@${target2.id}> (${target2.username})`;

    const embed = makeEmbed({
      title: "💖 Love Compatibility Calculator",
      description: desc,
      level: "PREMIUM",
      color: tier.color,
      thumbnail: target1.displayAvatarURL({ dynamic: true, size: 256 }),
      footer: "Daily Compatibility • Seeds change daily at midnight UTC",
    });

    return await ctx.reply({ embeds: [embed] });
  },
});
