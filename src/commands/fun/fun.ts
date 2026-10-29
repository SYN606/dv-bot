import { SlashCommandBuilder } from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed } from "../../core/embeds.js";
import { EMOJIS } from "../../core/emojis.js";
import { isBotAdmin } from "../../core/permissions.js";
import {
  bulkDisableCommandsGuild,
  bulkEnableCommandsGuild,
  isCommandGloballyDisabled,
} from "../../db/helpers/guildCommandDisable.js";
import { sendModLog } from "../../utils/modLog.js";

const FUN_COMMAND_NAMES = [
  "ship",
  "kiss",
  "lick",
  "lewd",
  "hug",
  "pat",
  "slap",
  "cuddle",
  "bite",
  "poke",
  "bonk",
  "roast",
];

const slashBuilder = new SlashCommandBuilder()
  .setName("fun")
  .setDescription("Explore or toggle the Fun & Roleplay command suite")
  .addStringOption((opt) =>
    opt
      .setName("action")
      .setDescription("Action to perform: view directory or toggle module (Admin only)")
      .setRequired(false)
      .addChoices(
        { name: "📋 Show Fun Commands", value: "list" },
        { name: "✅ Enable Fun Suite (Admin)", value: "enable" },
        { name: "❌ Disable Fun Suite (Admin)", value: "disable" }
      )
  );

export default createCommand({
  name: "fun",
  category: "Fun",
  description: "Explore or toggle the Fun & Roleplay command suite",
  usage: "[enable|disable|list]",
  examples: [
    "/fun",
    "/fun action:disable",
    "/fun action:enable",
    "dv fun",
    "dv fun disable",
    "dv fun enable",
  ],
  slashBuilder,

  async execute(ctx) {
    const { client, guild, member, user } = ctx;

    if (!guild) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Server Only",
            description: "Fun commands can only be used in a Discord server.",
            level: "ERROR",
          }),
        ],
        ephemeral: true,
      });
    }

    const action = (
      ctx.options.action ||
      ctx.options._args?.[0] ||
      "list"
    ).toLowerCase();

    // Check if the fun module is currently disabled in this guild
    const isCatDisabled =
      (await isCommandGloballyDisabled(guild.id, "category:fun")) ||
      (await isCommandGloballyDisabled(guild.id, "ship"));

    // --- ADMIN TOGGLE: ENABLE / DISABLE ---
    if (["enable", "on", "activate"].includes(action)) {
      if (!(await isBotAdmin(ctx))) {
        return await ctx.reply({
          embeds: [
            makeEmbed({
              title: "Permission Denied",
              description: `${EMOJIS.get("fail") || "❌"} You require **Administrator** or **Manage Server** permissions to toggle the Fun suite.`,
              level: "ERROR",
            }),
          ],
          ephemeral: true,
        });
      }

      await bulkEnableCommandsGuild(guild.id, [...FUN_COMMAND_NAMES, "category:fun"]);

      await sendModLog({
        guild,
        category: "CONFIG",
        title: "Fun Suite Enabled",
        description: `The **Fun & Roleplay** commands suite was enabled server-wide by <@${user.id}>.`,
        level: "INFO",
        actor: user,
      }).catch(() => {});

      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "🎉 Fun Commands Enabled!",
            description:
              `${EMOJIS.get("success") || "✅"} All **Fun & Roleplay** commands have been successfully **enabled** server-wide.\n\n` +
              `Members can now freely use \`dv ship\`, \`dv kiss\`, \`dv lick\`, \`dv lewd\`, and more!`,
            level: "SUCCESS",
            color: 0x57f287,
          }),
        ],
      });
    }

    if (["disable", "off", "deactivate"].includes(action)) {
      if (!(await isBotAdmin(ctx))) {
        return await ctx.reply({
          embeds: [
            makeEmbed({
              title: "Permission Denied",
              description: `${EMOJIS.get("fail") || "❌"} You require **Administrator** or **Manage Server** permissions to toggle the Fun suite.`,
              level: "ERROR",
            }),
          ],
          ephemeral: true,
        });
      }

      await bulkDisableCommandsGuild(guild.id, [...FUN_COMMAND_NAMES, "category:fun"]);

      await sendModLog({
        guild,
        category: "CONFIG",
        title: "Fun Suite Disabled",
        description: `The **Fun & Roleplay** commands suite was disabled server-wide by <@${user.id}>.`,
        level: "WARNING",
        actor: user,
      }).catch(() => {});

      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "🚫 Fun Commands Disabled",
            description:
              `${EMOJIS.get("warning") || "⚠️"} All **Fun & Roleplay** commands have been **disabled** server-wide.\n\n` +
              `Non-administrators can no longer execute fun commands in this server.`,
            level: "WARNING",
            color: 0xeb4d4b,
          }),
        ],
      });
    }

    // --- DEFAULT: SHOW FUN SUITE DIRECTORY ---
    const prefix = process.env.PREFIX || "dv";
    const statusText = isCatDisabled
      ? `🔴 **Module Status: Disabled** *(Server-wide)*`
      : `🟢 **Module Status: Active & Enabled**`;

    const desc =
      `### 🎉 Fun & Social Roleplay Suite\n` +
      `${statusText}\n\n` +
      `**Available Commands:**\n` +
      `• \`${prefix} ship <@user1> [@user2]\` — Advanced multi-stat love compatibility & couple ship algorithm\n` +
      `• \`${prefix} kiss <@user>\` — Sweet and affectionate anime kiss\n` +
      `• \`${prefix} hug <@user>\` — Warm and comforting embrace\n` +
      `• \`${prefix} cuddle <@user>\` — Cozy snuggle under a warm blanket\n` +
      `• \`${prefix} pat <@user>\` — Gentle headpats and affection\n` +
      `• \`${prefix} poke <@user>\` — Playful boop or poke for attention\n` +
      `• \`${prefix} lick <@user>\` — Playful anime lick reaction\n` +
      `• \`${prefix} bite <@user>\` — Affectionate nibble or anime bite\n` +
      `• \`${prefix} slap <@user>\` — Dramatic anime slap reaction\n` +
      `• \`${prefix} bonk <@user>\` — Send someone to horny jail with a squeaky hammer\n` +
      `• \`${prefix} lewd [@user]\` — Call someone out for being too lewd\n` +
      `• \`${prefix} roast [@user]\` — Witty, lighthearted comeback\n\n` +
      `💡 *Administrators can enable or disable this entire suite anytime with \`${prefix} fun enable\` or \`${prefix} fun disable\`, or via the web dashboard.*`;

    const embed = makeEmbed({
      title: "Digital Vigital • Fun Module",
      description: desc,
      level: "PREMIUM",
      color: 0xff69b4,
      footer: `Requested by ${user.username}`,
    });

    return await ctx.reply({ embeds: [embed] });
  },
});
