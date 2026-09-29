const IMAGE_URL_REGEX = /(https?:\/\/\S+\.(?:png|jpg|jpeg|gif|webp)(?:\?\S+)?)/i;

export function parseStickyContent(content) {
  if (!content) return { text: "", imageUrl: null, customEmojis: [] };

  const match = content.match(IMAGE_URL_REGEX);
  const imageUrl = match ? match[1] : null;

  // We could extract custom emojis if we want to preview them <a:name:id>
  // but for now we just return the text and parsed image URL
  const text = content;

  return { text, imageUrl };
}
