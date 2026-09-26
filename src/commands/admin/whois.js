import { SlashCommandBuilder } from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed } from "../../core/embeds.js";
import { EMOJIS } from "../../core/emojis.js";

// Helper for formatting timestamp
function formatTimestamp(timestamp) {
  if (!timestamp) return "Unknown";
  const unix = Math.floor(timestamp / 1000);
  return `<t:${unix}:F>\n<t:${unix}:R>`;
}

// Helper for permissions
function getPermissions(member) {
  if (member.guild && member.id === member.guild.ownerId) {
    return "Server Owner, Administrator";
  }

  const perms = member.permissions;
  if (perms.has("Administrator")) {
    return "Administrator";
  }

  const important = [];
  if (perms.has("ManageGuild")) important.push("Manage Server");
  if (perms.has("ManageRoles")) important.push("Manage Roles");
  if (perms.has("ManageChannels")) important.push("Manage Channels");
  if (perms.has("BanMembers")) important.push("Ban Members");
  if (perms.has("KickMembers")) important.push("Kick Members");

  return important.length ? important.slice(0, 5).join(", ") : "None";
}

// Helper for activities
function getActivities(member) {
  if (!member.presence || !member.presence.activities.length) {
    return "None";
  }
  const activities = [];
  for (const activity of member.presence.activities) {
    if (activity.type === 4) { // Custom status
      if (activity.emoji && activity.state) {
        activities.push(`${activity.emoji.toString()} ${activity.state}`);
      } else if (activity.state) {
        activities.push(activity.state);
      } else if (activity.emoji) {
        activities.push(activity.emoji.toString());
      }
    } else {
      if (activity.name) activities.push(activity.name);
    }
  }
  return activities.length ? activities.slice(0, 3).join("\n") : "None";
}

const slashBuilder = new SlashCommandBuilder()
  .setName("whois")
  .setDescription("View comprehensive user and member lookup information.")
  .addUserOption((opt) => opt.setName("user").setDescription("Target member").setRequired(false));

export default createCommand({
  name: "whois",
  description: "Cog providing comprehensive user and member lookup information.",
  category: "Admin",
  aliases: ["userinfo", "user", "ui"],
  slashBuilder,

  async execute(ctx) {
    const { guild, client } = ctx;
    if (!guild) return;

    let targetUser = ctx.user;
    if (ctx.options?.user) {
      const targetId = typeof ctx.options.user === "string" ? ctx.options.user : ctx.options.user.id;
      targetUser = await client.users.fetch(targetId).catch(() => ctx.user);
    } else if (ctx.message && ctx.message.mentions.users.size > 0) {
      targetUser = ctx.message.mentions.users.first();
    } else if (ctx.args && ctx.args.length > 0) {
      const match = ctx.args[0].match(/^<@!?(\d+)>$/) || [null, ctx.args[0]];
      targetUser = await client.users.fetch(match[1]).catch(() => ctx.user);
    }

    let fetchedUser;
    try {
      fetchedUser = await client.users.fetch(targetUser.id, { force: true });
    } catch (error) {
      fetchedUser = targetUser;
    }

    const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);

    // Join Position (if member)
    let joinPosition = "Unknown";
    if (targetMember) {
      const sortedMembers = Array.from(guild.members.cache.values()).sort((a, b) => (a.joinedTimestamp || 0) - (b.joinedTimestamp || 0));
      const index = sortedMembers.findIndex((m) => m.id === targetMember.id);
      if (index !== -1) {
        joinPosition = index + 1;
      }
    }

    // Roles (if member)
    let roleText = "None";
    let roles = [];
    if (targetMember) {
      roles = Array.from(targetMember.roles.cache.values())
        .filter((r) => r.id !== guild.id)
        .sort((a, b) => b.position - a.position)
        .map((r) => `<@&${r.id}>`);
      
      if (roles.length > 0) {
        roleText = roles.slice(0, 12).join(", ");
        if (roles.length > 12) {
          roleText += ` (+${roles.length - 12} more)`;
        }
      }
    }

    // Voice (if member)
    let voiceText = "Not connected";
    if (targetMember && targetMember.voice && targetMember.voice.channel) {
      voiceText = `<#${targetMember.voice.channel.id}> (${targetMember.voice.channel.members.size})`;
    }

    // Boosting (if member)
    const boostText = targetMember && targetMember.premiumSinceTimestamp 
      ? formatTimestamp(targetMember.premiumSinceTimestamp) 
      : "Not boosting";

    // Mutuals
    const mutuals = client.guilds.cache.filter((g) => g.members.cache.has(targetUser.id)).size;

    const developerEmoji = EMOJIS.get("developer") || "👨💻";
    const arrowEmoji = EMOJIS.get("arrow_point") || "▶";
    const messageEmoji = EMOJIS.get("message") || "💬";
    const folderEmoji = EMOJIS.get("folder") || "📁";
    const supportEmoji = EMOJIS.get("support_team") || "🔵";
    const boostEmoji = EMOJIS.get("booster") || "🚀";
    const modEmoji = EMOJIS.get("moderation") || "🛡️";
    const warningEmoji = EMOJIS.get("warning") || "⚠️";
    const curvedArrow = EMOJIS.get("curved_arrow") || "↪";

    const embedOptions = {
      title: `${targetUser.username}`,
      description: `${developerEmoji} <@${targetUser.id}>\n${arrowEmoji} \`${targetUser.id}\``,
      level: "INFO",
      thumbnail: targetUser.displayAvatarURL({ size: 1024, dynamic: true }),
      footer: `Action by : ${ctx.user.username}`,
      footerIcon: ctx.user.displayAvatarURL({ dynamic: true }),
      fields: []
    };

    if (fetchedUser.hexAccentColor) {
      embedOptions.color = parseInt(fetchedUser.hexAccentColor.replace("#", ""), 16);
    } else if (targetMember && targetMember.displayColor) {
      embedOptions.color = targetMember.displayColor;
    }
    
    if (fetchedUser.bannerURL()) {
      embedOptions.image = fetchedUser.bannerURL({ size: 1024, dynamic: true });
    }

    // Field 1: User
    const displayName = targetMember ? targetMember.displayName : (targetUser.globalName || targetUser.username);
    embedOptions.fields.push({
      name: `${messageEmoji} User`,
      value: `**Display:** ${displayName}\n**Global:** ${targetUser.globalName || 'None'}\n**Nickname:** ${targetMember?.nickname || 'None'}\n**Bot:** ${targetUser.bot ? "True" : "False"}`,
      inline: false
    });

    // Field 2: Created
    embedOptions.fields.push({
      name: `${folderEmoji} Created`,
      value: formatTimestamp(targetUser.createdTimestamp),
      inline: true
    });

    // Field 3: Joined (if member)
    embedOptions.fields.push({
      name: `${supportEmoji} Joined`,
      value: targetMember ? formatTimestamp(targetMember.joinedTimestamp) : "Unknown",
      inline: true
    });

    // Field 4: Boosting
    embedOptions.fields.push({
      name: `${boostEmoji} Boosting`,
      value: boostText,
      inline: true
    });

    // Field 5: Server (if member)
    if (targetMember) {
      const topRole = targetMember.roles.highest.id !== guild.id ? `<@&${targetMember.roles.highest.id}>` : "None";
      embedOptions.fields.push({
        name: `${modEmoji} Server`,
        value: `**Join Position:** #${joinPosition}\n**Top Role:** ${topRole}\n**Roles:** ${roles.length}\n**Voice:** ${voiceText}\n**Mutuals:** ${mutuals}`,
        inline: false
      });
      
      // Field 6: Permissions
      embedOptions.fields.push({
        name: `${warningEmoji} Permissions`,
        value: getPermissions(targetMember),
        inline: false
      });
      
      // Field 7: Activities
      embedOptions.fields.push({
        name: `${curvedArrow} Activities`,
        value: getActivities(targetMember),
        inline: false
      });
    } else {
      embedOptions.fields.push({
        name: `${modEmoji} Server`,
        value: `**Mutuals:** ${mutuals}\nNot a member of this server.`,
        inline: false
      });
    }

    // Field 8: Roles
    embedOptions.fields.push({
      name: `${folderEmoji} Roles (${roles.length})`,
      value: roleText,
      inline: false
    });

    const embed = makeEmbed(embedOptions);

    await ctx.reply({ embeds: [embed] });

    if (ctx.message) {
      ctx.message.delete().catch(() => null);
    }
  },
});
