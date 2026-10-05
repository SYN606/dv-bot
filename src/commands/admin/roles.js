import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed } from "../../core/embeds.js";
import { EMOJIS } from "../../core/emojis.js";
import { sendModLog } from "../../utils/modLog.js";

const slashBuilder = new SlashCommandBuilder()
  .setName("role")
  .setDescription("Manage server roles (assign or remove roles from members)")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
  .setDMPermission(false)
  .addSubcommand((sub) =>
    sub
      .setName("add")
      .setDescription("Assign a role to a member")
      .addUserOption((opt) =>
        opt.setName("user").setDescription("The member to receive the role").setRequired(true)
      )
      .addRoleOption((opt) =>
        opt.setName("role").setDescription("The role to assign").setRequired(true)
      )
      .addBooleanOption((opt) =>
        opt.setName("silent").setDescription("Make the response visible only to you").setRequired(false)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName("remove")
      .setDescription("Remove a role from a member")
      .addUserOption((opt) =>
        opt.setName("user").setDescription("The member to lose the role").setRequired(true)
      )
      .addRoleOption((opt) =>
        opt.setName("role").setDescription("The role to remove").setRequired(true)
      )
      .addBooleanOption((opt) =>
        opt.setName("silent").setDescription("Make the response visible only to you").setRequired(false)
      )
  );

export default createCommand({
  name: "role",
  description: "Manage server roles (assign or remove roles from members).",
  category: "Admin",
  slashOnly: true,
  modOnly: true,
  requiredPermission: PermissionFlagsBits.ManageRoles,
  slashBuilder,

  async execute(ctx) {
    if (!ctx.isInteraction) return;

    const { guild, user, member, client } = ctx;
    if (!guild) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Command Error",
            description: "This command can only be used in a server.",
            level: "ERROR",
          }),
        ],
        ephemeral: true,
      });
    }

    const sub = ctx.subcommand || ctx.interaction?.options?.getSubcommand?.(false);
    if (sub !== "add" && sub !== "remove") {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Invalid Usage",
            description: "Please specify either `/role add` or `/role remove`.",
            level: "ERROR",
          }),
        ],
        ephemeral: true,
      });
    }

    const targetUserId =
      ctx.interaction?.options?.getUser?.("user")?.id || ctx.options?.user;
    const roleId =
      ctx.interaction?.options?.getRole?.("role")?.id || ctx.options?.role;
    const silent = Boolean(ctx.interaction?.options?.getBoolean?.("silent"));

    if (!targetUserId || !roleId) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Invalid Arguments",
            description: "Both **user** and **role** options are required.\n\n`/role add <user> <role>`\n`/role remove <user> <role>`",
            level: "WARNING",
          }),
        ],
        ephemeral: true,
      });
    }

    // Resolve Role
    const role =
      ctx.interaction?.options?.getRole?.("role") ||
      guild.roles.cache.get(roleId) ||
      (await guild.roles.fetch(roleId).catch(() => null));

    if (!role) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Role Not Found",
            description: "The specified role could not be found in this server.",
            level: "ERROR",
          }),
        ],
        ephemeral: true,
      });
    }

    // Disallow modifying @everyone
    if (role.id === guild.id) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Invalid Role",
            description: "The `@everyone` role cannot be assigned or removed.",
            level: "ERROR",
          }),
        ],
        ephemeral: true,
      });
    }

    // Disallow managed roles (bot/integration/nitro boost roles)
    if (role.managed) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Managed Role",
            description: `The role ${role} is automatically managed by an integration (bot, nitro booster, or application) and cannot be manually assigned or removed.`,
            level: "ERROR",
          }),
        ],
        ephemeral: true,
      });
    }

    // Resolve Member
    let targetMember =
      ctx.interaction?.options?.getMember?.("user") ||
      guild.members.cache.get(targetUserId);

    if (!targetMember) {
      targetMember = await guild.members.fetch(targetUserId).catch(() => null);
    }

    if (!targetMember) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Member Not Found",
            description: "The specified user is not a member of this server.",
            level: "ERROR",
          }),
        ],
        ephemeral: true,
      });
    }

    // Check Bot Permissions & Hierarchy
    const botMember =
      guild.members.me || (await guild.members.fetchMe().catch(() => null));

    if (!botMember) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Error",
            description: "Could not verify bot permissions in this guild.",
            level: "ERROR",
          }),
        ],
        ephemeral: true,
      });
    }

    if (!botMember.permissions.has(PermissionFlagsBits.ManageRoles)) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Missing Permissions",
            description: "I need the **Manage Roles** permission to modify member roles.",
            level: "ERROR",
          }),
        ],
        ephemeral: true,
      });
    }

    // 1. Can Bot Manage this Role?
    if (role.position >= botMember.roles.highest.position) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Hierarchy Error",
            description: `I cannot manage ${role} because its position is higher than or equal to my highest role (${botMember.roles.highest}).`,
            level: "ERROR",
          }),
        ],
        ephemeral: true,
      });
    }

    // 2. Can Moderator Manage this Role? (Server owner bypasses hierarchy)
    const isOwner = guild.ownerId === user.id;
    if (!isOwner && member?.roles?.highest && role.position >= member.roles.highest.position) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Permission Denied",
            description: `You cannot manage ${role} because its position is higher than or equal to your highest role (${member.roles.highest}).`,
            level: "ERROR",
          }),
        ],
        ephemeral: true,
      });
    }

    // 3. Can Moderator Manage Target Member?
    if (targetMember.id === guild.ownerId && !isOwner) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Permission Denied",
            description: "You cannot modify roles for the server owner.",
            level: "ERROR",
          }),
        ],
        ephemeral: true,
      });
    }

    if (
      !isOwner &&
      targetMember.id !== user.id &&
      member?.roles?.highest &&
      targetMember.roles?.highest &&
      targetMember.roles.highest.position >= member.roles.highest.position
    ) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Permission Denied",
            description: `You cannot manage roles for ${targetMember} because they have an equal or higher role than you (${targetMember.roles.highest}).`,
            level: "ERROR",
          }),
        ],
        ephemeral: true,
      });
    }

    // Check Role Presence
    const hasRole = targetMember.roles.cache.has(role.id);

    if (sub === "add" && hasRole) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Already Has Role",
            description: `${targetMember} already has the ${role} role.`,
            level: "WARNING",
          }),
        ],
        ephemeral: true,
      });
    }

    if (sub === "remove" && !hasRole) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Missing Role",
            description: `${targetMember} does not have the ${role} role.`,
            level: "WARNING",
          }),
        ],
        ephemeral: true,
      });
    }

    // Perform Action
    await ctx.defer({ ephemeral: silent });

    const auditReason = `Role ${sub === "add" ? "assigned" : "removed"} by ${user.tag || user.username} (${user.id})`;

    try {
      if (sub === "add") {
        await targetMember.roles.add(role, auditReason);
      } else {
        await targetMember.roles.remove(role, auditReason);
      }
    } catch (err) {
      console.error(`[ROLE ${sub.toUpperCase()} ERROR]:`, err);
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Role Operation Failed",
            description: `Failed to ${sub === "add" ? "assign" : "remove"} ${role}: ${err?.message || "Discord API error"}.`,
            level: "ERROR",
          }),
        ],
        ephemeral: true,
      });
    }

    // Send Mod Log (Non-blocking)
    try {
      await sendModLog({
        guild,
        category: "ADMIN",
        title: sub === "add" ? "Role Assigned" : "Role Removed",
        description: `${user} ${sub === "add" ? "assigned" : "removed"} the ${role} role ${sub === "add" ? "to" : "from"} ${targetMember}.`,
        level: "INFO",
        actor: user,
        extraFields: {
          Member: `${targetMember.user?.tag || targetMember.user?.username || targetMember.id} (\`${targetMember.id}\`)`,
          Role: `${role.name} (\`${role.id}\`)`,
          Action: sub === "add" ? "Assigned" : "Removed",
        },
      });
    } catch (e) {
      // Mod log failure is non-fatal
    }

    const successIcon = EMOJIS.get("success") || "✅";
    const memberTag = targetMember.user?.tag || targetMember.user?.username || targetMember.id;
    const authorIcon = guild.iconURL?.() || undefined;

    return await ctx.reply({
      embeds: [
        makeEmbed({
          author: { name: "Role Management", iconURL: authorIcon },
          title: sub === "add" ? "Role Assigned" : "Role Removed",
          description:
            `${successIcon} Successfully ${sub === "add" ? "assigned" : "removed"} ${role} ${sub === "add" ? "to" : "from"} ${targetMember}.\n\n` +
            `➡️ **Member:** ${targetMember} (\`${memberTag}\`)\n` +
            `➡️ **Role:** ${role} (\`${role.name}\`)\n` +
            `➡️ **Moderator:** ${user}`,
          level: "SUCCESS",
          headerDivider: false,
        }),
      ],
      ephemeral: silent,
    });
  },
});
