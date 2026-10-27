const IMAGE_URL_REGEX = /(https?:\/\/\S+\.(?:png|jpg|jpeg|gif|webp)(?:\?\S+)?)/i;

export function parseStickyContent(content) {
  if (!content) return { text: "", imageUrl: null };

  const match = content.match(IMAGE_URL_REGEX);
  const imageUrl = match ? match[1] : null;
  const text = imageUrl ? content.replace(imageUrl, "").trim() : content.trim();

  return { text, imageUrl };
}
