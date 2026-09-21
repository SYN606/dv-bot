import { SlashCommandBuilder } from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed } from "../../core/embeds.js";

const ROASTS = [
  "You bring everyone so much joy... when you leave the voice channel.",
  "I'd agree with you, but then we'd both be completely wrong.",
  "Your secrets are always safe with me. I never even listen to begin with.",
  "You're proof that even mistakes can be persistent.",
  "I'm not insulting you, I'm just describing you accurately.",
  "You have an entire lifetime to be an idiot. Why not take today off?",
  "Somewhere out there, a tree is working tirelessly to produce oxygen for you. Please apologize to it.",
  "You're like a cloud. When you disappear, it's a beautiful day.",
];

const slashBuilder = new SlashCommandBuilder()
  .setName("fuck")
  .setDescription("Generate a lighthearted roast for a target user")
  .addUserOption((opt) => opt.setName("user").setDescription("Target user to roast").setRequired(false));

export default createCommand({
  name: "fuck",
  description: "Generate a lighthearted roast for a target user",
  category: "Utility",
  slashBuilder,

  async execute(ctx) {
    const target = ctx.options.user ? await ctx.client.users.fetch(ctx.options.user).catch(() => ctx.user) : ctx.user;
    const roast = ROASTS[Math.floor(Math.random() * ROASTS.length)];

    const embed = makeEmbed({
      title: "🔥 Roasted!",
      description: `<@${target.id}>, ${roast}`,
      level: "SYSTEM",
    });

    return await ctx.reply({ embeds: [embed] });
  },
});
