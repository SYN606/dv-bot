/**
 * Helper utility for extracting, sanitizing, and formatting media attachments,
 * media links, and visual previews for Discord message audit logging.
 */

export interface MessageAttachmentInfo {
  name: string;
  url: string;
  size: string;
  contentType: string | null;
  isImage: boolean;
  isVideo: boolean;
  isAudio: boolean;
}

export interface MediaLinkInfo {
  label: string;
  url: string;
  isImageOrGif: boolean;
}

export interface ExtractedMediaData {
  attachments: MessageAttachmentInfo[];
  mediaLinks: MediaLinkInfo[];
  stickers: Array<{ name: string; url: string }>;
  previewImageUrl: string | null;
  hasMedia: boolean;
}

/**
 * Format raw byte size into human-readable representation (e.g. 1.2 MB).
 */
export function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0 || isNaN(bytes)) return "";
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

const DIRECT_IMAGE_REGEX = /\.(png|jpe?g|gif|webp)(\?[^\s<>]*)?$/i;
const DIRECT_VIDEO_REGEX = /\.(mp4|webm|mov)(\?[^\s<>]*)?$/i;
const URL_REGEX = /https?:\/\/[^\s<>'"]+/gi;

/**
 * Extracts and categorizes attachments, media links, and stickers from a Discord message.
 */
export function extractMediaData(message: any): ExtractedMediaData {
  const attachments: MessageAttachmentInfo[] = [];
  let previewImageUrl: string | null = null;

  // 1. Process Message Attachments
  if (message?.attachments && typeof message.attachments.values === "function") {
    for (const att of message.attachments.values()) {
      const url = att.proxyURL || att.url;
      if (!url) continue;

      const name = att.name || "attachment";
      const contentType = att.contentType || "";
      const isImg =
        contentType.startsWith("image/") ||
        DIRECT_IMAGE_REGEX.test(name) ||
        DIRECT_IMAGE_REGEX.test(url);
      const isVid =
        contentType.startsWith("video/") ||
        DIRECT_VIDEO_REGEX.test(name) ||
        DIRECT_VIDEO_REGEX.test(url);
      const isAud = contentType.startsWith("audio/");

      const sizeStr = formatFileSize(att.size);

      attachments.push({
        name,
        url,
        size: sizeStr,
        contentType: contentType || null,
        isImage: isImg,
        isVideo: isVid,
        isAudio: isAud,
      });

      if (!previewImageUrl && isImg) {
        previewImageUrl = url;
      }
    }
  }

  // 2. Process Message Content for Media Links (Tenor, Giphy, Imgur, direct links)
  const mediaLinks: MediaLinkInfo[] = [];
  const content = typeof message?.content === "string" ? message.content : "";
  const foundUrls = content.match(URL_REGEX) || [];

  for (const rawUrl of foundUrls) {
    const url = rawUrl.replace(/[.,!?:;]+$/, ""); // Strip trailing punctuation
    const lower = url.toLowerCase();

    if (lower.includes("tenor.com/view/") || lower.includes("media.tenor.com/")) {
      mediaLinks.push({ label: "Tenor GIF", url, isImageOrGif: true });
      if (!previewImageUrl && lower.endsWith(".gif")) {
        previewImageUrl = url;
      }
    } else if (lower.includes("giphy.com/gifs/") || lower.includes("media.giphy.com/media/")) {
      mediaLinks.push({ label: "Giphy GIF", url, isImageOrGif: true });
      if (!previewImageUrl && (lower.endsWith(".gif") || lower.includes("media.giphy.com"))) {
        previewImageUrl = url;
      }
    } else if (lower.includes("imgur.com/")) {
      const isImgurImg = DIRECT_IMAGE_REGEX.test(lower);
      mediaLinks.push({ label: "Imgur Media", url, isImageOrGif: isImgurImg });
      if (!previewImageUrl && isImgurImg) {
        previewImageUrl = url;
      }
    } else if (lower.includes("cdn.discordapp.com/attachments/") || lower.includes("media.discordapp.net/attachments/")) {
      const isDiscordImg = DIRECT_IMAGE_REGEX.test(lower);
      mediaLinks.push({ label: "Discord Attachment", url, isImageOrGif: isDiscordImg });
      if (!previewImageUrl && isDiscordImg) {
        previewImageUrl = url;
      }
    } else if (lower.includes("youtube.com/watch") || lower.includes("youtu.be/")) {
      mediaLinks.push({ label: "YouTube Video", url, isImageOrGif: false });
    } else if (lower.includes("streamable.com/")) {
      mediaLinks.push({ label: "Streamable Clip", url, isImageOrGif: false });
    } else if (DIRECT_IMAGE_REGEX.test(lower)) {
      mediaLinks.push({ label: "Direct Image", url, isImageOrGif: true });
      if (!previewImageUrl) {
        previewImageUrl = url;
      }
    } else if (DIRECT_VIDEO_REGEX.test(lower)) {
      mediaLinks.push({ label: "Direct Video", url, isImageOrGif: false });
    }
  }

  // 3. Process Stickers
  const stickers: Array<{ name: string; url: string }> = [];
  if (message?.stickers && typeof message.stickers.values === "function") {
    for (const sticker of message.stickers.values()) {
      if (sticker.url) {
        stickers.push({
          name: sticker.name || "Sticker",
          url: sticker.url,
        });
        if (!previewImageUrl) {
          previewImageUrl = sticker.url;
        }
      }
    }
  }

  const hasMedia = attachments.length > 0 || mediaLinks.length > 0 || stickers.length > 0;

  return {
    attachments,
    mediaLinks,
    stickers,
    previewImageUrl,
    hasMedia,
  };
}

/**
 * Formats extracted media information into clean Discord embed field blocks.
 */
export function formatMediaFields(media: ExtractedMediaData): Record<string, string> {
  const fields: Record<string, string> = {};

  // Attachments field
  if (media.attachments.length > 0) {
    const lines = media.attachments.map((att) => {
      let icon = "📎";
      if (att.isImage) icon = "🖼️";
      else if (att.isVideo) icon = "🎥";
      else if (att.isAudio) icon = "🎵";

      const sizeDisplay = att.size ? ` \`(${att.size})\`` : "";
      return `${icon} [${att.name}](${att.url})${sizeDisplay}`;
    });

    fields[`Attached Files (${media.attachments.length})`] = lines.slice(0, 5).join("\n") +
      (lines.length > 5 ? `\n*...and ${lines.length - 5} more file(s)*` : "");
  }

  // Media Links field
  if (media.mediaLinks.length > 0) {
    const linkItems = media.mediaLinks.map((item) => `[${item.label}](${item.url})`);
    fields[`Media Links (${media.mediaLinks.length})`] = linkItems.slice(0, 6).join(" • ") +
      (linkItems.length > 6 ? ` • *+${linkItems.length - 6} more*` : "");
  }

  // Stickers field
  if (media.stickers.length > 0) {
    const stickerItems = media.stickers.map((s) => `[${s.name}](${s.url})`);
    fields["Stickers"] = stickerItems.join(" • ");
  }

  return fields;
}
