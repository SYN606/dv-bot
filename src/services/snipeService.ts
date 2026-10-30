export interface SnipeAttachment {
  name: string;
  url: string;
  contentType?: string | null;
}

export interface SnipeAuthor {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  bot: boolean;
}

export interface SnipeMessage {
  id: string;
  guildId: string;
  channelId: string;
  author: SnipeAuthor;
  content: string;
  attachments: SnipeAttachment[];
  image: string | null;
  createdAt: number;
  deletedAt: number;
}

// 2 hours retention window for sniped messages
const SNIPE_TTL_MS = 2 * 60 * 60 * 1000;
const MAX_CACHE_ENTRIES = 5000;

// In-memory zero-query maps with explicit type parameters per GEMINI.md
const channelSnipes = new Map<string, SnipeMessage>();
const userSnipes = new Map<string, SnipeMessage>();
const guildUserSnipes = new Map<string, SnipeMessage>();

// Background sweeper to prevent memory leaks from inactive channels
const snipeSweeper = setInterval(() => {
  const now = Date.now();
  for (const [key, snipe] of channelSnipes.entries()) {
    if (now - snipe.deletedAt > SNIPE_TTL_MS) channelSnipes.delete(key);
  }
  for (const [key, snipe] of userSnipes.entries()) {
    if (now - snipe.deletedAt > SNIPE_TTL_MS) userSnipes.delete(key);
  }
  for (const [key, snipe] of guildUserSnipes.entries()) {
    if (now - snipe.deletedAt > SNIPE_TTL_MS) guildUserSnipes.delete(key);
  }
}, 15 * 60 * 1000);
if (snipeSweeper.unref) snipeSweeper.unref();

/**
 * Record a deleted message into the snipe cache.
 * Overwrites prior entries so only the most recent deleted message is kept.
 */
export function recordDeletedMessage(message: any): void {
  if (!message || !message.guild || !message.channel) return;
  if (message.author?.bot) return;

  const content = typeof message.content === "string" ? message.content.trim() : "";
  const attachments: SnipeAttachment[] = [];
  let image: string | null = null;

  if (message.attachments && typeof message.attachments.values === "function") {
    for (const att of message.attachments.values()) {
      const attUrl = att.url || att.proxyURL;
      if (!attUrl) continue;

      attachments.push({
        name: att.name || "attachment",
        url: attUrl,
        contentType: att.contentType || null,
      });

      if (!image) {
        const isImg =
          att.contentType?.startsWith("image/") ||
          /\.(png|jpe?g|gif|webp)(\?.*)?$/i.test(att.name || attUrl);
        if (isImg) {
          image = att.proxyURL || attUrl;
        }
      }
    }
  }

  // Do not record if there is no visible content or attachment
  if (!content && attachments.length === 0) return;

  const authorId = String(message.author?.id || "unknown");
  const author: SnipeAuthor = {
    id: authorId,
    username: message.author?.username || "Unknown User",
    displayName:
      message.member?.displayName ||
      message.author?.displayName ||
      message.author?.username ||
      "Unknown User",
    avatarUrl:
      typeof message.author?.displayAvatarURL === "function"
        ? message.author.displayAvatarURL({ size: 256 })
        : "",
    bot: Boolean(message.author?.bot),
  };

  const channelId = String(message.channel.id);
  const guildId = String(message.guild.id);

  const snipeRecord: SnipeMessage = {
    id: String(message.id),
    guildId,
    channelId,
    author,
    content,
    attachments,
    image,
    createdAt: message.createdTimestamp || Date.now(),
    deletedAt: Date.now(),
  };

  // Enforce memory cap
  if (channelSnipes.size >= MAX_CACHE_ENTRIES) {
    channelSnipes.clear();
    userSnipes.clear();
    guildUserSnipes.clear();
  }

  // 1. Channel level (last deleted message in this channel)
  channelSnipes.set(channelId, snipeRecord);

  // 2. Channel + User level (last deleted message by this user in this channel)
  if (authorId !== "unknown") {
    userSnipes.set(`${channelId}:${authorId}`, snipeRecord);
    guildUserSnipes.set(`${guildId}:${authorId}`, snipeRecord);
  }
}

/**
 * Retrieve the last deleted message for a channel, optionally filtered by user.
 */
export function getSnipe(
  channelId: string,
  userId?: string | null,
  guildId?: string | null
): SnipeMessage | null {
  const cId = String(channelId);
  const now = Date.now();

  let snipe: SnipeMessage | undefined;

  if (userId) {
    const uId = String(userId);
    // 1. Check user-in-channel specific snipe
    snipe = userSnipes.get(`${cId}:${uId}`);

    // 2. Fall back to user-in-guild snipe if not in this channel
    if (!snipe && guildId) {
      snipe = guildUserSnipes.get(`${String(guildId)}:${uId}`);
    }
  } else {
    // Channel-wide latest deleted message
    snipe = channelSnipes.get(cId);
  }

  if (!snipe) return null;

  // TTL expiration check
  if (now - snipe.deletedAt > SNIPE_TTL_MS) {
    channelSnipes.delete(snipe.channelId);
    userSnipes.delete(`${snipe.channelId}:${snipe.author.id}`);
    guildUserSnipes.delete(`${snipe.guildId}:${snipe.author.id}`);
    return null;
  }

  return snipe;
}

/**
 * Clear snipe cache
 */
export function clearSnipes(guildId?: string | null): void {
  if (guildId) {
    const gId = String(guildId);
    for (const [key, val] of channelSnipes.entries()) {
      if (val.guildId === gId) channelSnipes.delete(key);
    }
    for (const [key, val] of userSnipes.entries()) {
      if (val.guildId === gId) userSnipes.delete(key);
    }
    for (const [key, val] of guildUserSnipes.entries()) {
      if (val.guildId === gId) guildUserSnipes.delete(key);
    }
  } else {
    channelSnipes.clear();
    userSnipes.clear();
    guildUserSnipes.clear();
  }
}
