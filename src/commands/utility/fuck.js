import { SlashCommandBuilder } from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed, COLORS } from "../../core/embeds.js";

const ROASTS = [
  "You bring everyone so much joy... when you leave the voice channel.",
  "I'd agree with you, but then we'd both be completely wrong.",
  "Your secrets are always safe with me. I never even listen to begin with.",
  "You're proof that even mistakes can be persistent.",
  "I'm not insulting you, I'm just describing you accurately.",
  "You have an entire lifetime to be an idiot. Why not take today off?",
  "Somewhere out there, a tree is working tirelessly to produce oxygen for you. Please apologize to it.",
  "You're like a cloud. When you disappear, it's a beautiful day.",
  "I'd explain it to you, but I don't have the crayons or the patience.",
  "You're like a software update. Whenever I see you, I think 'Not now'.",
  "If laughter is the best medicine, your face must be curing illnesses worldwide.",
  "You are proof that evolution can sometimes take a wrong turn.",
  "Don't worry about what people think. They don't do it very often anyway.",
  "You're not completely useless; you can always serve as a bad example.",
  "Your brain is like a browser with 100 tabs open, and 99 of them are frozen.",
  "I’m jealous of people who have never met you.",
  "You're the reason the gene pool needs a lifeguard.",
  "If ignorance were currency, you'd be a billionaire.",
  "You have the right to remain silent, because anything you say will likely be nonsense.",
  "I would roast you, but my mother taught me not to burn trash.",
  "Calling you an amateur would be an insult to amateurs.",
  "You possess a mind so open that your common sense leaked out long ago.",
  "Were you born this annoying, or did you have to practice for it?",
  "You have delusions of adequacy.",
  "I'd slap you, but that would be animal abuse.",
  "If your brain were dynamite, there wouldn't be enough to blow your hat off.",
  "You're like a pop-up ad: nobody asked for you, and everyone wants you to close.",
  "Your Wi-Fi has more bandwidth than your train of thought.",
  "You bring peace and quiet wherever you go... immediately after you leave.",
  "I'm not saying you're clueless, but you make rocks look like scholars.",
  "Even the bot's error handler has higher standards than your arguments.",
  "You could fall into a pile of four-leaf clovers and still complain about the weeds.",
  "You have the charisma of a damp sponge and the intellect to match.",
  "You are the human equivalent of a participation trophy.",
  "You couldn't pour water out of a boot with the instructions printed on the heel.",
  "I don't know what makes you so stubborn, but it's really working against you.",
  "Your opinion is like a 404 error: completely unhelpful and better off ignored.",
  "I'd love to see things from your perspective, but I can't get my head that low.",
  "You have a face made for radio and a voice made for silent movies.",
  "You are simply impossible to underestimate.",
  "You couldn't handle a thought if it had training wheels attached.",
  "I'd tell you to go touch grass, but the grass deserves better.",
  "Every time you speak, you lower the channel's collective IQ by 10 points.",
  "You're the human equivalent of a loading spinner that never finishes.",
  "Your logic has more holes than Swiss cheese in a shooting range.",
  "I've seen dial-up connections with faster processing speeds than your brain.",
  "If you were any slower, you'd be going backward in time.",
  "You look like you struggle with push and pull doors on a daily basis.",
  "Your microphone is on mute, and for the first time today, everyone is happy.",
  "You're living proof that even artificial intelligence can't fix natural stupidity.",
  "I’ve heard better arguments from a broken elevator.",
  "You're like a captcha test: frustrating, unnecessary, and nobody wants to deal with you.",
  "You bring nothing to the table, but you still complain about the menu.",
  "The only thing more fragile than your ego is server uptime during a Discord outage.",
  "You have all the qualifications of an echo chamber: loud, repetitive, and empty.",
  "I would explain common sense to you, but that would require both of us to understand miracles.",
  "You are proof that silence truly is golden, especially when you are around.",
  "If confusion were an Olympic sport, you'd take home the gold medal every single time.",
  "You manage to be the least interesting person in a room full of mannequins.",
  "You speak at 120 words per minute with 0 ideas per hour.",
];

/**
 * Shuffle Deck Engine to guarantee 100% non-repetitive draws.
 * Cycles through all items before reshuffling, and never repeats the last item consecutively.
 */
class NonRepeatingDeck {
  constructor(items) {
    this.original = [...items];
    this.deck = [];
    this.lastDrawn = null;
  }

  draw() {
    if (this.deck.length === 0) {
      // Fisher-Yates shuffle
      const fresh = [...this.original];
      for (let i = fresh.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [fresh[i], fresh[j]] = [fresh[j], fresh[i]];
      }

      // Guarantee the first item of the new deck is never identical to the last drawn item
      if (this.lastDrawn && fresh[fresh.length - 1] === this.lastDrawn && fresh.length > 1) {
        [fresh[fresh.length - 1], fresh[0]] = [fresh[0], fresh[fresh.length - 1]];
      }

      this.deck = fresh;
    }

    const item = this.deck.pop();
    this.lastDrawn = item;
    return item;
  }

  get totalCount() {
    return this.original.length;
  }
}

export const ROAST_DECK = new NonRepeatingDeck(ROASTS);

const slashBuilder = new SlashCommandBuilder()
  .setName("fuck")
  .setDescription("Generate a witty, non-repetitive roast for a user")
  .addUserOption((opt) => opt.setName("user").setDescription("Target user to roast").setRequired(false));

export default createCommand({
  name: "fuck",
  aliases: ["roast", "burn"],
  description: "Generate a witty, non-repetitive roast for a user",
  category: "Utility",
  slashBuilder,

  async execute(ctx) {
    const { client, message, options, user } = ctx;

    // Resolve target: slash option -> prefix mention -> prefix snowflake ID -> fallback to caller
    let target = null;

    if (options.user) {
      target = await client.users.fetch(options.user).catch(() => null);
    } else if (message?.mentions?.users?.size > 0) {
      target = message.mentions.users.first();
    } else if (options.primary) {
      const cleanId = options.primary.replace(/[<@!>]/g, "").trim();
      if (/^\d{17,20}$/.test(cleanId)) {
        target = await client.users.fetch(cleanId).catch(() => null);
      }
    }

    if (!target) {
      target = user;
    }

    // Draw guaranteed non-repeating roast
    const roast = ROAST_DECK.draw();

    const embed = makeEmbed({
      title: "🔥 Roasted!",
      description: `<@${target.id}>, ${roast}`,
      level: "SYSTEM",
      color: COLORS.DARK,
      footer: {
        text: `Burn Deck: ${ROAST_DECK.totalCount} unique roasts • Fresh & non-repetitive`,
      },
    });

    return await ctx.reply({ embeds: [embed] });
  },
});
