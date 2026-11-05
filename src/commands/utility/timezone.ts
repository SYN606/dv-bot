import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  type AutocompleteInteraction,
} from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed, COLORS } from "../../core/embeds.js";
import { EMOJIS } from "../../core/emojis.js";
import {
  COMMON_TIMEZONES,
  getGuildTimezone,
  setGuildTimezone,
  getUserTimezone,
  setUserTimezone,
  isValidTimezone,
  formatInTimezone,
  getTimezoneOffsetString,
} from "../../db/helpers/timezone.js";

const slashBuilder = new SlashCommandBuilder()
  .setName("timezone")
  .setDescription("Configure and view server or personal timezone preferences")
  .addSubcommand((sub) =>
    sub
      .setName("view")
      .setDescription("Display the current server timezone, your personal timezone, and live clocks")
  )
  .addSubcommand((sub) =>
    sub
      .setName("set")
      .setDescription("Configure the server's primary timezone (Admins & Managers)")
      .addStringOption((opt) =>
        opt
          .setName("timezone")
          .setDescription("Select or type an IANA timezone (e.g., America/New_York, Asia/Kolkata, UTC)")
          .setRequired(true)
          .setAutocomplete(true)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName("me")
      .setDescription("Set or check your personal timezone across DV-BOT commands")
      .addStringOption((opt) =>
        opt
          .setName("timezone")
          .setDescription("Your personal timezone (e.g. Europe/London, Asia/Tokyo)")
          .setRequired(false)
          .setAutocomplete(true)
      )
  );

export default createCommand({
  name: "timezone",
  category: "Utility",
  aliases: ["time", "tz", "settimezone"],
  description: "View and customize server or personal timezones",
  usage: "[view | set <timezone> | me [timezone]]",
  examples: [
    "/timezone view",
    "/timezone set timezone:Asia/Kolkata",
    "/timezone me timezone:America/New_York",
    "dv timezone",
    "dv timezone set Europe/London",
    "dv timezone me Asia/Tokyo",
  ],
  slashBuilder,

  async autocomplete(interaction: AutocompleteInteraction) {
    const focused = interaction.options.getFocused(true);
    if (focused.name === "timezone") {
      const query = (focused.value || "").toLowerCase().trim();
      const filtered = COMMON_TIMEZONES.filter(
        (tz) =>
          tz.value.toLowerCase().includes(query) ||
          tz.label.toLowerCase().includes(query) ||
          tz.region.toLowerCase().includes(query)
      ).slice(0, 25);

      await interaction.respond(
        filtered.map((tz) => ({
          name: `${tz.value} (${getTimezoneOffsetString(tz.value)}) - ${tz.region}`,
          value: tz.value,
        }))
      );
    }
  },

  async execute(ctx) {
    const { guild, user, member } = ctx;
    const now = new Date();

    // 1. Resolve Subcommand & Arguments for both Slash & Prefix
    let sub = ctx.subcommand || "view";
    let targetTimezone: string | null = null;

    if (ctx.isInteraction) {
      targetTimezone = ctx.options.getString?.("timezone") || null;
    } else {
      const args = ctx.options._args || [];
      const firstArg = args[0]?.toLowerCase();

      if (firstArg === "set") {
        sub = "set";
        targetTimezone = args.slice(1).join("_").trim() || null;
      } else if (firstArg === "me") {
        sub = "me";
        targetTimezone = args.slice(1).join("_").trim() || null;
      } else if (firstArg === "view") {
        sub = "view";
      } else if (firstArg) {
        // Direct timezone input: "dv timezone Asia/Kolkata"
        if (isValidTimezone(firstArg)) {
          targetTimezone = firstArg;
          sub = "view";
        }
      }
    }

    // --- SUBCOMMAND: SET (Server Timezone) ---
    if (sub === "set") {
      if (!guild) {
        return await ctx.reply({
          embeds: [
            makeEmbed({
              title: "Server Required",
              description: "Server timezone can only be configured inside a Discord server.",
              level: "ERROR",
            }),
          ],
          ephemeral: true,
        });
      }

      // Permissions check: ManageGuild or Administrator
      const canManage =
        member?.permissions?.has(PermissionFlagsBits.ManageGuild) ||
        member?.permissions?.has(PermissionFlagsBits.Administrator) ||
        guild.ownerId === user?.id;

      if (!canManage) {
        return await ctx.reply({
          embeds: [
            makeEmbed({
              title: "Permission Denied",
              description: `${EMOJIS.get("fail") || "❌"} You require the **Manage Server** or **Administrator** permission to modify the server timezone.`,
              level: "ERROR",
            }),
          ],
          ephemeral: true,
        });
      }

      if (!targetTimezone || !isValidTimezone(targetTimezone)) {
        return await ctx.reply({
          embeds: [
            makeEmbed({
              title: "Invalid Timezone",
              description:
                `${EMOJIS.get("warning") || "⚠️"} \`${targetTimezone || "none"}\` is not a recognized IANA timezone identifier.\n\n` +
                "**Examples of valid timezones:**\n" +
                "• `UTC`\n" +
                "• `America/New_York` (US Eastern)\n" +
                "• `Europe/London` (UK / GMT)\n" +
                "• `Asia/Kolkata` (India / IST)\n" +
                "• `Asia/Tokyo` (Japan / JST)\n" +
                "• `Australia/Sydney` (AEST)\n\n" +
                "Use the slash command `/timezone set` to search with auto-complete.",
              level: "WARNING",
            }),
          ],
          ephemeral: true,
        });
      }

      await setGuildTimezone(guild.id, targetTimezone);
      const formattedNow = formatInTimezone(now, targetTimezone, {
        dateStyle: "full",
        timeStyle: "medium",
      });
      const offset = getTimezoneOffsetString(targetTimezone);

      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "🌐 Server Timezone Updated",
            description:
              `${EMOJIS.get("success") || "✅"} Server timezone successfully set to **\`${targetTimezone}\`** (${offset}).\n\n` +
              `🕒 **Current Server Time:** \`${formattedNow}\``,
            level: "SUCCESS",
            color: COLORS.SUCCESS,
            footer: "All server telemetry, analytics, and scheduled tasks now reflect this timezone.",
          }),
        ],
      });
    }

    // --- SUBCOMMAND: ME (Personal User Timezone) ---
    if (sub === "me") {
      if (!user) return;

      if (!targetTimezone) {
        // Query user's current personal timezone
        const userTz = await getUserTimezone(user.id);
        const serverTz = guild ? await getGuildTimezone(guild.id) : "UTC";
        const effectiveTz = userTz || serverTz;
        const formattedUserTime = formatInTimezone(now, effectiveTz, {
          dateStyle: "full",
          timeStyle: "medium",
        });

        return await ctx.reply({
          embeds: [
            makeEmbed({
              title: "👤 Your Personal Timezone",
              description: userTz
                ? `Your configured personal timezone is **\`${userTz}\`** (${getTimezoneOffsetString(userTz)}).\n\n` +
                  `🕒 **Your Local Time:** \`${formattedUserTime}\``
                : `You do not have a personal timezone configured yet. Commands currently default to the server timezone (**\`${serverTz}\`**).\n\n` +
                  `*Tip: Run \`/timezone me timezone:<your-zone>\` to save your personal timezone.*`,
              level: "INFO",
              color: COLORS.INFO,
            }),
          ],
          ephemeral: true,
        });
      }

      if (!isValidTimezone(targetTimezone)) {
        return await ctx.reply({
          embeds: [
            makeEmbed({
              title: "Invalid Timezone",
              description: `${EMOJIS.get("fail") || "❌"} \`${targetTimezone}\` is not a recognized timezone identifier.`,
              level: "ERROR",
            }),
          ],
          ephemeral: true,
        });
      }

      await setUserTimezone(user.id, targetTimezone);
      const formattedUserNow = formatInTimezone(now, targetTimezone, {
        dateStyle: "full",
        timeStyle: "medium",
      });

      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "👤 Personal Timezone Saved",
            description:
              `${EMOJIS.get("success") || "✅"} Your personal timezone has been set to **\`${targetTimezone}\`** (${getTimezoneOffsetString(targetTimezone)}).\n\n` +
              `🕒 **Your Local Time:** \`${formattedUserNow}\``,
            level: "SUCCESS",
            color: COLORS.SUCCESS,
          }),
        ],
        ephemeral: true,
      });
    }

    // --- SUBCOMMAND: VIEW ---
    const serverTz = guild ? await getGuildTimezone(guild.id) : "UTC";
    const userTz = user ? await getUserTimezone(user.id) : null;

    const serverTimeStr = formatInTimezone(now, serverTz, {
      dateStyle: "medium",
      timeStyle: "medium",
    });
    const utcTimeStr = formatInTimezone(now, "UTC", {
      dateStyle: "medium",
      timeStyle: "medium",
    });

    const fields = [
      {
        name: "🏰 Server Timezone",
        value: `**Zone:** \`${serverTz}\` (${getTimezoneOffsetString(serverTz)})\n**Current Time:** \`${serverTimeStr}\``,
        inline: true,
      },
      {
        name: "🌍 Coordinated Universal Time (UTC)",
        value: `**Zone:** \`UTC\` (UTC+0)\n**Current Time:** \`${utcTimeStr}\``,
        inline: true,
      },
    ];

    if (userTz) {
      const userTimeStr = formatInTimezone(now, userTz, {
        dateStyle: "medium",
        timeStyle: "medium",
      });
      fields.push({
        name: "👤 Your Personal Timezone",
        value: `**Zone:** \`${userTz}\` (${getTimezoneOffsetString(userTz)})\n**Current Time:** \`${userTimeStr}\``,
        inline: false,
      });
    }

    return await ctx.reply({
      embeds: [
        makeEmbed({
          title: `🕒 Timezone & Clocks • ${guild?.name || "Global"}`,
          description:
            `Server administrators can change the server timezone using \`/timezone set\`.\n` +
            `Members can set their personal timezone using \`/timezone me\`.`,
          level: "PRIMARY",
          color: COLORS.PRIMARY,
          fields,
          footer: "Timestamps across Discord embed footers and Discord relative tags (<t:...>) also adjust to your local device automatically.",
        }),
      ],
    });
  },
});
