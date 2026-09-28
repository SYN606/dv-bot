/**
 * Resolves server, channel, role, and member template variables in text strings.
 *
 * Supported Variables:
 * - {server}, {server.name}, {guild}, {guild.name} -> Server Name
 * - {server.id}, {guild.id} -> Server ID
 * - {memberCount}, {members}, {member_count}, {server.memberCount} -> Member Count
 * - {owner}, {server.owner}, {owner.id} -> Server Owner Mention
 * - {owner.name}, {owner.tag} -> Server Owner Username
 * - {channel}, {channel.name}, {channel.mention} -> Channel Mention
 * - {verifiedRole}, {verified_role} -> Verified Role Mention
 * - {unverifiedRole}, {unverified_role} -> Unverified Role Mention
 * - {rules}, {rulesChannel}, {rules_channel} -> Rules Channel Mention
 * - {boosts}, {boost_count}, {server.boosts} -> Server Boost Count
 * - {boostTier}, {boost_tier}, {server.tier} -> Server Boost Tier
 * - {server.icon}, {icon} -> Server Icon URL
 */
export function formatServerVariables(text, { guild, channel, config = {}, user = null } = {}) {
  if (typeof text !== "string" || !text) return text || "";

  const serverName = guild?.name || "Server";
  const serverId = guild?.id ? String(guild.id) : "";
  const memberCount = typeof guild?.memberCount === "number"
    ? guild.memberCount.toLocaleString()
    : "0";

  const ownerId = guild?.ownerId ? String(guild.ownerId) : "";
  const ownerMention = ownerId ? `<@${ownerId}>` : "@Owner";
  const ownerName = guild?.members?.cache?.get(ownerId)?.user?.username || guild?.ownerName || "Owner";

  const channelMention = channel?.id ? `<#${channel.id}>` : (channel?.name ? `#${channel.name}` : "");
  const channelName = channel?.name ? `#${channel.name}` : "";

  const rawVerifiedRoleId = config?.verified_role_id || config?.verifiedRoleId;
  const verifiedRoleId = rawVerifiedRoleId && String(rawVerifiedRoleId) !== "null" && String(rawVerifiedRoleId) !== "undefined"
    ? String(rawVerifiedRoleId).trim()
    : null;
  const verifiedRoleMention = verifiedRoleId ? `<@&${verifiedRoleId}>` : "@Verified";

  const unverifiedRoleId = config?.unverified_role_id || config?.unverifiedRoleId;
  const unverifiedRoleMention = unverifiedRoleId ? `<@&${unverifiedRoleId}>` : "@Unverified";

  const rulesChannelId = guild?.rulesChannelId;
  const rulesMention = rulesChannelId ? `<#${rulesChannelId}>` : "#rules";

  const boosts = guild?.premiumSubscriptionCount !== undefined ? String(guild.premiumSubscriptionCount) : "0";
  const boostTier = guild?.premiumTier !== undefined ? `Level ${guild.premiumTier}` : "Level 0";
  const iconUrl = typeof guild?.iconURL === "function" ? guild.iconURL() : (guild?.icon || "");

  const replacements = [
    // Server Name
    [/\{server\.name\}|\{guild\.name\}|\{server\}|\{guild\}/gi, serverName],
    // Server ID
    [/\{server\.id\}|\{guild\.id\}/gi, serverId],
    // Member Count
    [/\{memberCount\}|\{member_count\}|\{server\.memberCount\}|\{server\.members\}|\{members\}/gi, memberCount],
    // Owner Mention / Tag
    [/\{owner\.mention\}|\{owner\.id\}|\{owner\}|\{server\.owner\}/gi, ownerMention],
    [/\{owner\.name\}|\{owner\.tag\}/gi, ownerName],
    // Channel Mention
    [/\{channel\.name\}|\{channel\.mention\}|\{channel\}/gi, channelMention],
    [/\{channel\.plain\}/gi, channelName],
    // Roles Mention
    [/\{verifiedRole\}|\{verified_role\}/gi, verifiedRoleMention],
    [/\{unverifiedRole\}|\{unverified_role\}/gi, unverifiedRoleMention],
    // Rules
    [/\{rulesChannel\}|\{rules_channel\}|\{rules\}/gi, rulesMention],
    // Boosts
    [/\{boosts\}|\{boost_count\}|\{server\.boosts\}/gi, boosts],
    [/\{boostTier\}|\{boost_tier\}|\{server\.tier\}/gi, boostTier],
    // Server Icon
    [/\{server\.icon\}|\{icon\}/gi, iconUrl],
  ];

  let result = text;
  for (const [pattern, val] of replacements) {
    result = result.replace(pattern, val);
  }

  return result;
}

export function parseServerVariables(text, guildOrOptions, channel, config, user) {
  if (guildOrOptions && typeof guildOrOptions === "object" && ("guild" in guildOrOptions || "channel" in guildOrOptions || "config" in guildOrOptions)) {
    return formatServerVariables(text, guildOrOptions);
  }
  return formatServerVariables(text, {
    guild: guildOrOptions,
    channel,
    config,
    user,
  });
}

export const SERVER_VARIABLES_LIST = [
  { key: "{verifiedRole}", desc: "Verified Role Mention", example: "@Verified" },
];
