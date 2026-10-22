import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed } from "../../core/embeds.js";
import { EMOJIS } from "../../core/emojis.js";
import { sendModLog } from "../../utils/modLog.js";

const slashBuilder = new SlashCommandBuilder()
  .setName("selfrename")
  .setDescription("Change or reset your own server nickname")
  .addStringOption((opt) =>
    opt
      .setName("nickname")
      .setDescription("Your new nickname, or 'reset' to revert to your username")
      .setRequired(true)
      .setMaxLength(32)
  );

export default createCommand({
  name: "selfrename",
  description: "Change or reset your own server nickname",
  category: "Utility",
  aliases: ["selfnick", "myname", "nickme"],
  usage: "<nickname> | reset",
  examples: [
    "/selfrename nickname:Ace",
    "/selfrename nickname:reset",
    "dvselfrename Ace",
    "dvselfnick reset",
  ],
  slashBuilder,

  async execute(ctx) {
    const { guild, user, member } = ctx;
    if (!guild) {
      return await ctx.reply({
        content: "This command can only be used in a server.",
        ephemeral: true,
      });
    }

    if (!member) {
      return await ctx.reply({
        content: "Could not resolve your server membership details.",
        ephemeral: true,
      });
    }

    // 1. Check Bot permissions
    const botMember = guild.members.me || (await guild.members.fetchMe().catch(() => null));
    if (!botMember?.permissions?.has(PermissionFlagsBits.ManageNicknames)) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Bot Missing Permission",
            description: `${EMOJIS.get("fail") || "❌"} I need the **Manage Nicknames** permission in this server to update your nickname.`,
            level: "ERROR",
          }),
        ],
        ephemeral: true,
      });
    }

    // 2. Check Caller permission to change their nickname
    const canChangeNick =
      guild.ownerId === user.id ||
      member.permissions?.has(PermissionFlagsBits.ChangeNickname) ||
      member.permissions?.has(PermissionFlagsBits.ManageNicknames) ||
      member.permissions?.has(PermissionFlagsBits.Administrator);

    if (!canChangeNick) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Permission Denied",
            description: `${EMOJIS.get("fail") || "❌"} You do not have the **Change Nickname** permission in this server.`,
            level: "ERROR",
          }),
        ],
        ephemeral: true,
      });
    }

    // 3. Discord API Restriction: Server Owner cannot be renamed by any bot
    if (guild.ownerId === user.id) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Action Not Permitted",
            description: `${EMOJIS.get("warning") || "⚠️"} Discord does not permit bots to change the server owner's nickname. Please change your nickname manually in server settings.`,
            level: "WARNING",
          }),
        ],
        ephemeral: true,
      });
    }

    // 4. Role Hierarchy Check: Bot's highest role vs Member's highest role
    if (member.roles.highest.position >= botMember.roles.highest.position) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Role Hierarchy Restriction",
            description: `${EMOJIS.get("fail") || "❌"} I cannot change your nickname because your highest role is higher than or equal to my highest role.`,
            level: "ERROR",
          }),
        ],
        ephemeral: true,
      });
    }

    // 5. Extract input
    let inputNick = ctx.options.nickname;
    if (!inputNick && ctx.options._args?.length > 0) {
      inputNick = ctx.options._args.join(" ");
    }

    if (!inputNick || !inputNick.trim()) {
      const prefix = ctx.client?.config?.PREFIX || "!";
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Missing Nickname",
            description: `Please specify your desired nickname, or \`reset\` to clear it.\n\n• \`/selfrename nickname: YourName\`\n• \`${prefix}selfrename YourName\`\n• \`/selfrename nickname: reset\``,
            level: "WARNING",
          }),
        ],
        ephemeral: true,
      });
    }

    const oldNick = member.displayName;
    const trimmedInput = inputNick.trim();

    // 6. Reset Flow
    if (trimmedInput.toLowerCase() === "reset") {
      if (!member.nickname) {
        return await ctx.reply({
          embeds: [
            makeEmbed({
              title: "No Custom Nickname",
              description: `${EMOJIS.get("info") || "ℹ️"} You do not have an active custom nickname set. Your display name is already your default username (**${user.username}**).`,
              level: "INFO",
            }),
          ],
          ephemeral: true,
        });
      }

      try {
        await member.setNickname(null, `Self-reset by ${user.tag || user.username}`);
      } catch (err) {
        return await ctx.reply({
          embeds: [
            makeEmbed({
              title: "Reset Failed",
              description: `${EMOJIS.get("fail") || "❌"} Failed to reset your nickname: ${err?.message || "Discord API error"}.`,
              level: "ERROR",
            }),
          ],
          ephemeral: true,
        });
      }

      await sendModLog({
        guild,
        category: "NICKNAME",
        title: "Self Nickname Reset",
        description: `<@${user.id}> reset their nickname back to **${user.username}**.`,
        level: "INFO",
        actor: user,
        target: user,
        extraFields: { "Previous Display Name": oldNick },
      }).catch(() => {});

      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Nickname Reset",
            description: `${EMOJIS.get("success") || "✅"} Your nickname has been reset back to **${user.username}**.`,
            level: "SUCCESS",
          }),
        ],
      });
    }

    // 7. Sanitize & Validate Nickname
    const cleaned = trimmedInput.replace(/[\u200B-\u200D\uFEFF]/g, "").trim();

    if (!cleaned) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Invalid Nickname",
            description: `${EMOJIS.get("fail") || "❌"} Nickname cannot be empty or contain only invisible / zero-width characters.`,
            level: "ERROR",
          }),
        ],
        ephemeral: true,
      });
    }

    if (cleaned.includes("@everyone") || cleaned.includes("@here")) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Invalid Nickname",
            description: `${EMOJIS.get("fail") || "❌"} Mass mentions (\`@everyone\`, \`@here\`) are not allowed in nicknames.`,
            level: "ERROR",
          }),
        ],
        ephemeral: true,
      });
    }

    const clampedNick = cleaned.slice(0, 32);

    if (member.nickname === clampedNick) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "No Change",
            description: `${EMOJIS.get("info") || "ℹ️"} Your nickname is already set to **${clampedNick}**.`,
            level: "INFO",
          }),
        ],
        ephemeral: true,
      });
    }

    // 8. Apply Nickname
    try {
      await member.setNickname(clampedNick, `Self-rename by ${user.tag || user.username}`);
    } catch (err) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Update Failed",
            description: `${EMOJIS.get("fail") || "❌"} Failed to change your nickname: ${err?.message || "Discord API error"}.`,
            level: "ERROR",
          }),
        ],
        ephemeral: true,
      });
    }

    await sendModLog({
      guild,
      category: "NICKNAME",
      title: "Self Nickname Changed",
      description: `<@${user.id}> changed their nickname to **${clampedNick}**.`,
      level: "INFO",
      actor: user,
      target: user,
      extraFields: {
        "Previous Display Name": oldNick,
        "New Nickname": clampedNick,
      },
    }).catch(() => {});

    return await ctx.reply({
      embeds: [
        makeEmbed({
          title: "Nickname Updated",
          description: `${EMOJIS.get("success") || "✅"} Your nickname has been changed to **${clampedNick}**.`,
          level: "SUCCESS",
        }),
      ],
    });
  },
});
