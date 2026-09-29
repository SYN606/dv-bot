export const QUICK_UNICODE_EMOJIS = [
  "🔥", "✨", "😂", "👍", "❤️", "💀", "👀", "✅", "❌", "🎉", "👏", "🙌", "💯", "🤯", "😎", "🚀"
];

export function parseDiscordEmoji(str) {
  if (!str || typeof str !== "string") return null;
  const match = str.trim().match(/^<(a)?:([a-zA-Z0-9_]+):([0-9]+)>$/);
  if (match) {
    const isAnimated = Boolean(match[1]);
    const name = match[2];
    const id = match[3];
    return {
      isCustom: true,
      isAnimated,
      name,
      id,
      url: `https://cdn.discordapp.com/emojis/${id}.${isAnimated ? "gif" : "png"}`,
      raw: str.trim(),
    };
  }
  return {
    isCustom: false,
    raw: str.trim(),
  };
}


export function getDiscordAvatarUrl(user) {
  if (!user || !user.avatar) return "https://cdn.discordapp.com/embed/avatars/0.png";
  if (user.avatar.startsWith("http")) return user.avatar;
  return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`;
}
