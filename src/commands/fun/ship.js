import { SlashCommandBuilder } from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed } from "../../core/embeds.js";
import { getAnimeActionGif } from "./_animeGifs.js";

/**
 * Intelligent Portmanteau (Ship Name Generator)
 * Blends two names using syllable boundaries and vowels for catchy celebrity/anime ship names.
 */
function generateSmartShipName(name1, name2) {
  const clean1 = name1.replace(/[^a-zA-Z0-9]/g, "").trim() || name1.slice(0, 4);
  const clean2 = name2.replace(/[^a-zA-Z0-9]/g, "").trim() || name2.slice(0, 4);

  // Find vowel cutoff point in first name
  const vowels = /[aeiouy]/i;
  let splitIndex1 = -1;
  for (let i = 1; i < clean1.length; i++) {
    if (vowels.test(clean1[i])) {
      splitIndex1 = i + 1;
      break;
    }
  }
  if (splitIndex1 === -1) {
    splitIndex1 = Math.max(2, Math.ceil(clean1.length / 2));
  }

  // Find start point in second name
  let splitIndex2 = Math.floor(clean2.length / 2);
  for (let i = 1; i < clean2.length; i++) {
    if (vowels.test(clean2[i])) {
      splitIndex2 = i;
      break;
    }
  }

  const prefix = clean1.slice(0, splitIndex1);
  const suffix = clean2.slice(splitIndex2);
  const combined = prefix + suffix;

  return combined.charAt(0).toUpperCase() + combined.slice(1).toLowerCase();
}

/**
 * Multi-Dimensional Love & Compatibility Algorithm
 * Calculates base affinity, sub-factors (Chemistry, Passion, Trust, Banter),
 * and incorporates daily luck variance + true randomness when requested.
 */
function calculateAdvancedShip(id1, id2, forceRandom = false) {
  const s1 = String(id1);
  const s2 = String(id2);
  const sortedPair = [s1, s2].sort().join(":");

  // Stable seed from user snowflake IDs
  let idHash = 0;
  for (let i = 0; i < sortedPair.length; i++) {
    idHash = (idHash << 5) - idHash + sortedPair.charCodeAt(i);
    idHash |= 0;
  }
  const baseAffinity = Math.abs(idHash) % 75 + 15; // 15 to 90

  // Daily seed for cosmic variance
  const dateKey = new Date().toISOString().slice(0, 10);
  const dailySeed = `${sortedPair}:${dateKey}`;
  let dailyHash = 0;
  for (let i = 0; i < dailySeed.length; i++) {
    dailyHash = (dailyHash << 5) - dailyHash + dailySeed.charCodeAt(i);
    dailyHash |= 0;
  }

  // Daily variance: -14% to +14%
  const dailyVariance = (Math.abs(dailyHash) % 29) - 14;

  let finalScore;
  if (forceRandom) {
    // True random spin (with slight bias towards fun middle-to-high scores)
    const roll1 = Math.floor(Math.random() * 101);
    const roll2 = Math.floor(Math.random() * 101);
    finalScore = Math.round((roll1 + roll2) / 2);
  } else {
    finalScore = Math.min(100, Math.max(0, baseAffinity + dailyVariance));
  }

  // Calculate 4 realistic sub-dimensions around the score
  const chemistry = Math.min(100, Math.max(5, finalScore + ((Math.abs(dailyHash >> 2) % 21) - 10)));
  const passion = Math.min(100, Math.max(5, finalScore + ((Math.abs(dailyHash >> 4) % 25) - 12)));
  const trust = Math.min(100, Math.max(5, finalScore + ((Math.abs(idHash >> 2) % 21) - 10)));
  const banter = Math.min(100, Math.max(5, finalScore + ((Math.abs(idHash >> 4) % 23) - 11)));

  return {
    score: finalScore,
    chemistry,
    passion,
    trust,
    banter,
  };
}

/**
 * Animated-style Heart Progress Bar
 */
function createHeartLoveBar(percent, totalHearts = 10) {
  const filledCount = Math.round((percent / 100) * totalHearts);
  const emptyCount = totalHearts - filledCount;
  const hearts = "❤️".repeat(filledCount) + "🤍".repeat(emptyCount);
  return `${hearts} **${percent}%**`;
}

/**
 * 12 Rich Compatibility Tiers with custom commentaries and colors
 */
function getDetailedShipTier(percent) {
  if (percent === 100) {
    return {
      title: "💍 Cosmic Soulmates • Written in the Stars!",
      badge: "LEGENDARY MATCH",
      comment: "A flawless, breathtaking connection! Your souls were intertwined across dimensions. Go plan the wedding already!",
      color: 0xff1493, // Deep neon pink
      level: "PREMIUM",
    };
  }
  if (percent === 69) {
    return {
      title: "😏 Nice • Unrivaled Spicy Chemistry!",
      badge: "SPICY SPARK",
      comment: "The sacred number has spoken! The banter is electric, the tension is real, and the chemistry is completely off the charts.",
      color: 0xff4757,
      level: "PREMIUM",
    };
  }
  if (percent >= 90) {
    return {
      title: "💖 Passionate Star-Crossed Lovers!",
      badge: "INCREDIBLE CHEMISTRY",
      comment: "You two finish each other's sentences and match each other's chaotic energy. Pure romantic magic!",
      color: 0xff69b4,
      level: "PREMIUM",
    };
  }
  if (percent >= 80) {
    return {
      title: "💘 Sweet Romance & Radiant Sparks!",
      badge: "HIGH COMPATIBILITY",
      comment: "Major butterflies in the stomach! Everyone in the server can see the blushing whenever you two talk.",
      color: 0xe056fd,
      level: "PREMIUM",
    };
  }
  if (percent >= 70) {
    return {
      title: "🌹 Blossoming Affection & Strong Vibe!",
      badge: "VERY COMPATIBLE",
      comment: "A strong foundation of laughter, mutual respect, and undeniable attraction. Highly recommended!",
      color: 0xbe2edd,
      level: "INFO",
    };
  }
  if (percent >= 60) {
    return {
      title: "☕ Cozy Coffee Date & Flirty Banter!",
      badge: "PROMISING",
      comment: "Late night gaming calls and casual teasing could easily blossom into something sweet and special.",
      color: 0x48dbfb,
      level: "INFO",
    };
  }
  if (percent >= 50) {
    return {
      title: "🌤️ Good Energy with Potential!",
      badge: "NEUTRAL / BALANCED",
      comment: "Great common ground! With a little extra communication and shared memes, sparks could definitely fly.",
      color: 0xfeca57,
      level: "INFO",
    };
  }
  if (percent >= 40) {
    return {
      title: "⚖️ Study Buddies & Casual Friends!",
      badge: "PLATONIC VIBES",
      comment: "You make great squadmates for gaming and chatting, but romantic signals might get lost in transmission.",
      color: 0x1dd1a1,
      level: "INFO",
    };
  }
  if (percent >= 30) {
    return {
      title: "🌧️ Dangerously Close to the Friendzone!",
      badge: "FRIENDZONE ALERT",
      comment: "One of you gives relationship vibes, while the other hits back with a bro-fist. Handle with emotional care!",
      color: 0x576574,
      level: "WARNING",
    };
  }
  if (percent >= 20) {
    return {
      title: "🥶 Personality Clash • Ice Cold!",
      badge: "LOW COMPATIBILITY",
      comment: "Total oil and water. Trying to agree on a movie will turn into a 3-hour heated server debate.",
      color: 0x8395a7,
      level: "WARNING",
    };
  }
  if (percent >= 10) {
    return {
      title: "💥 Enemies to Lovers (Heavy on Enemies)!",
      badge: "DANGEROUS",
      comment: "Constant roasting and mutual eye-rolls. Maybe in an alternate anime universe, but not in this one!",
      color: 0xff6b6b,
      level: "ERROR",
    };
  }
  return {
    title: "☠️ Total Catastrophe • Run Away!",
    badge: "HAZARDOUS",
    comment: "Disaster warning! It's like putting milk before cereal and dipping pickles in coffee. Keep at least 5 channels apart!",
    color: 0xee5253,
    level: "ERROR",
  };
}

/**
 * 25+ Fun Daily Relationship Horoscopes & Prophecies
 */
const LOVE_HOROSCOPES = [
  "Forecast: One of you will leave the other on delivered for 2 hours, then reply with a voice note of aggressive giggling.",
  "Forecast: High probability of arguing for 40 minutes over what to eat, only to end up ordering pizza.",
  "Forecast: 100% chance of synchronized heart reacts when no one else is looking in chat.",
  "Forecast: One of you will accidentally leak an embarrassing secret during a late-night gaming session.",
  "Forecast: Mutual agreement that you're both weird, which makes you perfect together.",
  "Forecast: Expect matching Discord profile themes and Spotify listening parties soon.",
  "Forecast: High risk of play-fighting in VC that ends with someone muting themselves in dramatic silence.",
  "Forecast: A shared meme will make both of you laugh so hard you choke on water.",
  "Forecast: Someone is secretly stalking the other's status message right now.",
  "Forecast: 10/10 compatibility when roasting mutual friends in server general.",
  "Forecast: An unplanned 3 AM voice call will reveal you both share the exact same hyperfixations.",
  "Forecast: Beware: One of you will steal the other's hoodie and never return it.",
];

const slashBuilder = new SlashCommandBuilder()
  .setName("ship")
  .setDescription("Calculate advanced love compatibility & couple ship stats between two users")
  .addUserOption((opt) =>
    opt.setName("user1").setDescription("First user to ship").setRequired(true)
  )
  .addUserOption((opt) =>
    opt.setName("user2").setDescription("Second user to ship (defaults to yourself)").setRequired(false)
  )
  .addBooleanOption((opt) =>
    opt.setName("random").setDescription("Roll a fresh random lucky roll instead of daily affinity").setRequired(false)
  );

export default createCommand({
  name: "ship",
  category: "Fun",
  aliases: ["shipping", "match", "lovemeter", "compat"],
  description: "Calculate advanced love compatibility & couple ship stats between two users",
  usage: "<@user1> [@user2] [--random]",
  examples: [
    "/ship user1:@Friend",
    "/ship user1:@Alice user2:@Bob",
    "/ship user1:@Friend random:True",
    "dv ship @Friend",
    "dv ship @Alice @Bob",
    "dv ship @Friend --random",
  ],
  slashBuilder,

  async execute(ctx) {
    const { client, message, user } = ctx;

    let target1 = null;
    let target2 = null;
    let isRandom = Boolean(ctx.options.random);

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
      if (ctx.options.raw?.includes("--random") || ctx.options.raw?.includes("-r")) {
        isRandom = true;
      }

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
            description:
              "Please mention at least one user to calculate love compatibility! 💕\n\n" +
              "**Examples:**\n" +
              "• `dv ship @Friend` (ships you with a friend)\n" +
              "• `dv ship @User1 @User2` (ships two other users)\n" +
              "• `dv ship @Friend --random` (rolls a fresh lucky spin)",
            level: "WARNING",
          }),
        ],
        ephemeral: true,
      });
    }

    if (!target2) {
      target2 = user;
    }

    // Easter Egg 1: Self-shipping
    if (target1.id === target2.id) {
      const embed = makeEmbed({
        title: "👑 Self-Love Champion!",
        description:
          `### <@${target1.id}> × <@${target1.id}>\n\n` +
          `${createHeartLoveBar(100)}\n\n` +
          `> *"Loving yourself is the beginning of a lifelong romance." — Oscar Wilde*\n\n` +
          `**Couple Name:** **\`${target1.username}\`**\n` +
          `**Self-Chemistry:** 100% • **Self-Care:** 100% • **Drama:** 0%\n\n` +
          `You're confident, independent, and thriving! Take yourself out for dessert today! ✨`,
        level: "PREMIUM",
        color: 0xff1493,
        thumbnail: target1.displayAvatarURL({ dynamic: true, size: 256 }),
        footer: "100% Unconditional Self-Worth",
      });
      return await ctx.reply({ embeds: [embed] });
    }

    // Easter Egg 2: Shipping with the bot
    const isBotInvolved = target1.id === client.user.id || target2.id === client.user.id;
    if (isBotInvolved) {
      const human = target1.id === client.user.id ? target2 : target1;
      const embed = makeEmbed({
        title: "🤖 Cybernetic Besties & AI Romance!",
        description:
          `### <@${human.id}> × <@${client.user.id}>\n\n` +
          `${createHeartLoveBar(69)}\n\n` +
          `> *“B-Baka! I'm an advanced Discord moderation bot... but I guess my silicon heart has a soft spot for you!”* 🤖💕\n\n` +
          `**Ship Name:** **\`${generateSmartShipName(human.username, client.user.username)}\`**\n` +
          `**CPU Frequency:** Overheating • **Packet Loss:** 0% • **Affection:** Maximum`,
        level: "PREMIUM",
        color: 0x5865f2,
        thumbnail: client.user.displayAvatarURL({ dynamic: true, size: 256 }),
        footer: "Digital Vigital Affection Engine",
      });
      return await ctx.reply({ embeds: [embed] });
    }

    // Easter Egg 3: Shipping two bots together
    if (target1.bot && target2.bot) {
      const embed = makeEmbed({
        title: "⚡ Artificial Intelligence Singularity Romance!",
        description:
          `### <@${target1.id}> × <@${target2.id}>\n\n` +
          `${createHeartLoveBar(99)}\n\n` +
          `> *Two neural networks meeting across the Discord gateway... A match written in binary code!* 💾✨\n\n` +
          `**Ship Name:** **\`${generateSmartShipName(target1.username, target2.username)}\`**\n` +
          `**Latency:** 1ms • **Data Transfer:** Seamless • **Status:** Automated Soulmates`,
        level: "PREMIUM",
        color: 0x00d2d3,
        footer: "Machine Learning Love Compatibility",
      });
      return await ctx.reply({ embeds: [embed] });
    }

    // Run Advanced Compatibility Calculation
    const { score, chemistry, passion, trust, banter } = calculateAdvancedShip(target1.id, target2.id, isRandom);
    const tier = getDetailedShipTier(score);
    const shipName = generateSmartShipName(target1.username, target2.username);

    // Pick dynamic horoscope based on user IDs
    const horoscopeIndex = Math.abs(Number(target1.id.slice(-4)) + Number(target2.id.slice(-4))) % LOVE_HOROSCOPES.length;
    const horoscope = LOVE_HOROSCOPES[horoscopeIndex];

    // Pick anime GIF matching the romance tier
    const gifType = score >= 60 ? "ship_love" : "ship_clash";
    const gifUrl = await getAnimeActionGif(gifType);

    const desc =
      `### 💕 <@${target1.id}> × <@${target2.id}>\n\n` +
      `**Ship Name:** **\`${shipName}\`**\n` +
      `**Love Meter:**\n${createHeartLoveBar(score)}\n\n` +
      `### ${tier.title}\n` +
      `> ${tier.comment}\n\n` +
      `📊 **Relationship Dynamics:**\n` +
      `• 💘 **Chemistry:** \`${chemistry}%\`  • 🔥 **Passion:** \`${passion}%\`\n` +
      `• 🤝 **Trust:** \`${trust}%\`      • 💬 **Banter:** \`${banter}%\`\n\n` +
      `🔮 *${horoscope}*`;

    const embed = makeEmbed({
      title: `💖 Compatibility Test • ${tier.badge}`,
      description: desc,
      level: tier.level,
      color: tier.color,
      thumbnail: target1.displayAvatarURL({ dynamic: true, size: 256 }),
      image: gifUrl,
      footer: isRandom ? "Lucky Random Roll 🎲" : "Daily Affinity • Resets daily at midnight UTC",
    });

    return await ctx.reply({ embeds: [embed] });
  },
});
