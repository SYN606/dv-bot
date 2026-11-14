/**
 * AFK media and formatting utility
 * Handles extracting media URLs (GIFs, images, Tenor, Giphy), resolving direct GIF links,
 * and normalizing reason text to prevent duplicate emojis and visual clutter.
 */

const MEDIA_URL_REGEX = /(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/i;

const DIRECT_MEDIA_EXT_REGEX = /\.(?:gif|png|jpe?g|webp)(\?.*)?$/i;

const SUPPORTED_HOSTS_REGEX = /(?:tenor\.com|giphy\.com|cdn\.discordapp\.com|media\.discordapp\.net|i\.imgur\.com)/i;

/**
 * Extract an image or GIF URL from user text and/or message attachments.
 */
export function extractAfkMedia(
  rawText: string = "",
  attachments?: any
): { cleanText: string; mediaUrl: string | null } {
  let mediaUrl: string | null = null;

  // 1. Check message attachments if provided
  if (attachments && attachments.size > 0) {
    const attachList = Array.isArray(attachments) ? attachments : Array.from(attachments.values ? attachments.values() : []);
    const imgAttach: any = attachList.find(
      (a: any) =>
        (a.contentType && a.contentType.startsWith("image/")) ||
        DIRECT_MEDIA_EXT_REGEX.test(a.url || "")
    );
    if (imgAttach?.url) {
      mediaUrl = imgAttach.url;
    }
  }

  // 2. Check for URL inside text
  let cleanText = String(rawText || "").replace(/[`\r\n]+/g, " ").trim();
  const match = cleanText.match(MEDIA_URL_REGEX);

  if (match) {
    const candidateUrl = match[0];
    const isMedia =
      DIRECT_MEDIA_EXT_REGEX.test(candidateUrl) ||
      SUPPORTED_HOSTS_REGEX.test(candidateUrl);

    if (isMedia) {
      if (!mediaUrl) {
        mediaUrl = candidateUrl;
      }
      cleanText = cleanText.replace(candidateUrl, "").replace(/\s+/g, " ").trim();
    }
  }

  return {
    cleanText: cleanText || "AFK",
    mediaUrl,
  };
}

/**
 * Resolve direct image/GIF URL from Tenor or Giphy sharing links.
 */
export async function resolveDirectMediaUrl(url: string | null): Promise<string | null> {
  if (!url) return null;

  // Direct image or already on media subdomain
  if (
    DIRECT_MEDIA_EXT_REGEX.test(url) ||
    url.includes("media.tenor.com") ||
    url.includes("media.giphy.com") ||
    url.includes("cdn.discordapp.com")
  ) {
    return url;
  }

  // Tenor view page (e.g. https://tenor.com/view/...)
  if (/tenor\.com\/view\//i.test(url)) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 1200);

      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; Discordbot/2.0)" },
        signal: controller.signal,
      }).catch(() => null);

      clearTimeout(timer);

      if (res && res.ok) {
        const html = await res.text().catch(() => "");
        const ogImageMatch =
          html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i) ||
          html.match(/<meta\s+content=["']([^"']+)["']\s+property=["']og:image["']/i);

        if (ogImageMatch?.[1]) {
          return ogImageMatch[1];
        }
      }
    } catch {
      // Fallback to original URL
    }
  }

  // Giphy share page (e.g. https://giphy.com/gifs/slug-id)
  if (/giphy\.com\/gifs\//i.test(url)) {
    const idMatch = url.match(/giphy\.com\/gifs\/(?:.*-)?([a-zA-Z0-9]+)$/i);
    if (idMatch?.[1]) {
      return `https://media.giphy.com/media/${idMatch[1]}/giphy.gif`;
    }
  }

  return url;
}

/**
 * Format AFK reason for embeds without duplicate emojis or awkward grammar.
 */
export function formatAfkDescription(userId: string, reason: string): string {
  const trimmed = (reason || "").trim();
  const isCustom = trimmed.length > 0 && trimmed.toLowerCase() !== "afk";

  if (!isCustom) {
    return `<@${userId}> is now AFK.`;
  }

  return `<@${userId}> is now AFK: **${trimmed}**`;
}
