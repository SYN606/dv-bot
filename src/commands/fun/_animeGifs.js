/**
 * Curated high-quality anime GIFs for social roleplay actions.
 * Fast, reliable, and guaranteed safe-for-work (SFW).
 */

export const ANIME_GIFS = {
  kiss: [
    "https://media1.tenor.com/m/7T1c-5-OjxMAAAAC/anime-kiss.gif",
    "https://media1.tenor.com/m/e3OWV5-g_EsAAAAC/kiss-anime.gif",
    "https://media1.tenor.com/m/d_32b_Q6_KAAAAAC/anime-kiss.gif",
    "https://media1.tenor.com/m/I83W1z7mDAnAAAAC/anime-kiss.gif",
    "https://media1.tenor.com/m/wQ1ohPnp3uAAAAAC/anime-kiss.gif",
    "https://media1.tenor.com/m/I4u7U-0220wAAAAC/kiss.gif",
    "https://media1.tenor.com/m/Wo215vHXyhgAAAAC/anime-couple.gif",
    "https://media.giphy.com/media/G3va31oEEnIkM/giphy.gif",
    "https://media.giphy.com/media/FqBTvSNjNzeZG/giphy.gif",
  ],
  lick: [
    "https://media1.tenor.com/m/0v_E_5nNlF8AAAAC/lick-anime.gif",
    "https://media1.tenor.com/m/kK08f9L_92QAAAAC/anime-lick.gif",
    "https://media1.tenor.com/m/17G_z8e6G20AAAAC/anime-lick.gif",
    "https://media1.tenor.com/m/3A_Wk323o8wAAAAC/anime-lick.gif",
    "https://media1.tenor.com/m/W7fS1d4W-m0AAAAC/lick-cat.gif",
    "https://media1.tenor.com/m/u5K5iV8f38UAAAAC/anime-lick.gif",
    "https://media1.tenor.com/m/Yw_k2dC1tqUAAAAC/lick-cheek.gif",
  ],
  lewd: [
    "https://media1.tenor.com/m/BfO1eHwUu-QAAAAC/lewd-anime.gif",
    "https://media1.tenor.com/m/4W21H9-O6o8AAAAC/anime-lewd.gif",
    "https://media1.tenor.com/m/K6R7B3qf7_AAAAAC/blushing-anime.gif",
    "https://media1.tenor.com/m/o_12pL9eW8sAAAAC/anime-embarrassed.gif",
    "https://media1.tenor.com/m/9V9p19S1B4UAAAAC/fbi-open-up.gif",
    "https://media1.tenor.com/m/W-vXU6ZJ4E4AAAAC/lewd-police.gif",
    "https://media1.tenor.com/m/07iF0tWj9-EAAAAC/anime-blush.gif",
    "https://media1.tenor.com/m/r4fK6qjV5-EAAAAC/chika-lewd.gif",
    "https://media1.tenor.com/m/6y6kI4hY-f0AAAAC/lewd-meme.gif",
  ],
  hug: [
    "https://media1.tenor.com/m/kCZVO9q708AAAAAC/hug-anime.gif",
    "https://media1.tenor.com/m/MM970xO0e4sAAAAC/anime-hug.gif",
    "https://media1.tenor.com/m/gg7s325f1_AAAAAC/hug-warm.gif",
    "https://media1.tenor.com/m/xgZu5qVjFwUAAAAC/anime-hug.gif",
    "https://media1.tenor.com/m/2lrDXtxRBlcAAAAC/anime-cuddle.gif",
  ],
  pat: [
    "https://media1.tenor.com/m/4e4O3Zg7YpQAAAAC/anime-pat.gif",
    "https://media1.tenor.com/m/2vIfTpdCQnkAAAAC/anime-head-pat.gif",
    "https://media1.tenor.com/m/8DaDmr2A5f4AAAAC/head-pat-anime.gif",
    "https://media1.tenor.com/m/Y74W_i7w4JIAAAAC/pat-head.gif",
  ],
  slap: [
    "https://media1.tenor.com/m/Ws6Dm1ZW_vMAAAAC/anime-slap.gif",
    "https://media1.tenor.com/m/4wFfPz_B0_8AAAAC/slap-anime.gif",
    "https://media1.tenor.com/m/CvB7-zyFuhMAAAAC/anime-slap.gif",
    "https://media1.tenor.com/m/iDdSBzk5D2AAAAAC/anime-slap-girl.gif",
  ],
};

/**
 * Returns a random anime GIF URL for the requested action.
 * Performs a fast non-blocking fetch to nekos.best if network is active,
 * falling back instantly to the verified curated collection.
 */
export async function getAnimeActionGif(action) {
  const list = ANIME_GIFS[action] || ANIME_GIFS.lewd;
  const fallback = list[Math.floor(Math.random() * list.length)];

  // Actions supported by nekos.best API
  const nekosActions = ["kiss", "hug", "pat", "slap"];
  if (nekosActions.includes(action)) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 1200);
      const res = await fetch(`https://nekos.best/api/v2/${action}`, {
        signal: controller.signal,
      }).catch(() => null);
      clearTimeout(timer);

      if (res && res.ok) {
        const data = await res.json().catch(() => null);
        if (data?.results?.[0]?.url) {
          return data.results[0].url;
        }
      }
    } catch {
      // Fallback seamlessly on any network error/timeout
    }
  }

  return fallback;
}
