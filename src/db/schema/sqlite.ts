import { sqliteTable, text, integer, uniqueIndex, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// 1. Core Models
export const guilds = sqliteTable("guilds", {
  guild_id: text("guild_id").primaryKey(),
  created_at: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
  updated_at: text("updated_at").default(sql`(CURRENT_TIMESTAMP)`),
});

export const users = sqliteTable("users", {
  user_id: text("user_id").primaryKey(),
  created_at: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
  updated_at: text("updated_at").default(sql`(CURRENT_TIMESTAMP)`),
});

export const roleRestrictions = sqliteTable(
  "role_restrictions",
  {
    id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
    guild_id: text("guild_id").notNull(),
    role_id: text("role_id").notNull(),
    feature: text("feature").notNull(),
    restriction_type: text("restriction_type").notNull(),
    created_at: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
    updated_at: text("updated_at").default(sql`(CURRENT_TIMESTAMP)`),
  },
  (table) => ({
    guildRoleFeatureUnique: uniqueIndex("idx_role_restrictions_unique").on(
      table.guild_id,
      table.role_id,
      table.feature,
      table.restriction_type
    ),
    guildFeatureIndex: index("idx_role_restrictions_feature").on(
      table.guild_id,
      table.feature,
      table.restriction_type
    ),
  })
);

export const channelRestrictions = sqliteTable(
  "channel_restrictions",
  {
    id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
    guild_id: text("guild_id").notNull(),
    channel_id: text("channel_id").notNull(),
    feature: text("feature").notNull(),
    restriction_type: text("restriction_type").notNull(),
    created_at: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
    updated_at: text("updated_at").default(sql`(CURRENT_TIMESTAMP)`),
  },
  (table) => ({
    guildChannelFeatureUnique: uniqueIndex("idx_channel_restrictions_unique").on(
      table.guild_id,
      table.channel_id,
      table.feature,
      table.restriction_type
    ),
    guildFeatureIndex: index("idx_channel_restrictions_feature").on(
      table.guild_id,
      table.feature,
      table.restriction_type
    ),
  })
);

export const adminRoles = sqliteTable(
  "admin_roles",
  {
    id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
    guild_id: text("guild_id").notNull(),
    role_id: text("role_id").notNull(),
  },
  (table) => ({
    guildRoleUnique: uniqueIndex("idx_admin_roles_unique").on(table.guild_id, table.role_id),
  })
);

export const adminUsers = sqliteTable(
  "admin_users",
  {
    id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
    guild_id: text("guild_id").notNull(),
    user_id: text("user_id").notNull(),
  },
  (table) => ({
    guildUserUnique: uniqueIndex("idx_admin_users_unique").on(table.guild_id, table.user_id),
  })
);

// 2. Feature Models
export const afk = sqliteTable(
  "afk",
  {
    id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
    guild_id: text("guild_id").notNull(),
    user_id: text("user_id").notNull(),
    afk_reason: text("afk_reason").notNull(),
    since: integer("since", { mode: "number" }).notNull(),
    original_nickname: text("original_nickname"),
    mentions: text("mentions"),
    created_at: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
    updated_at: text("updated_at").default(sql`(CURRENT_TIMESTAMP)`),
  },
  (table) => ({
    guildUserIdx: uniqueIndex("idx_afk_guild_user_unique").on(table.guild_id, table.user_id),
  })
);

export const mediaOnlyChannels = sqliteTable(
  "media_only_channels",
  {
    id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
    guild_id: text("guild_id").notNull(),
    channel_id: text("channel_id").notNull(),
    sticky_message_id: text("sticky_message_id"),
    whitelist_role_id: text("whitelist_role_id"),
    image_only: integer("image_only", { mode: "boolean" }).default(false),
    auto_mute: integer("auto_mute", { mode: "boolean" }).default(false),
    nsfw_bypass: integer("nsfw_bypass", { mode: "boolean" }).default(true),
    created_at: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
    updated_at: text("updated_at").default(sql`(CURRENT_TIMESTAMP)`),
  },
  (table) => ({
    guildChannelUnique: uniqueIndex("idx_media_only_guild_channel").on(table.guild_id, table.channel_id),
  })
);

export const stickyMessages = sqliteTable(
  "sticky_messages",
  {
    id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
    guild_id: text("guild_id").notNull(),
    channel_id: text("channel_id").notNull(),
    sticky_content: text("sticky_content").notNull(),
    last_message_id: text("last_message_id"),
    counter: integer("counter", { mode: "number" }).default(0),
    created_at: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
    updated_at: text("updated_at").default(sql`(CURRENT_TIMESTAMP)`),
  },
  (table) => ({
    guildChannelUnique: uniqueIndex("idx_sticky_messages_guild_channel").on(table.guild_id, table.channel_id),
  })
);

export const disabledCommands = sqliteTable(
  "disabled_commands",
  {
    id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
    guild_id: text("guild_id").notNull(),
    command_name: text("command_name").notNull(),
  },
  (table) => ({
    guildCommandUnique: uniqueIndex("idx_disabled_commands_guild_command").on(table.guild_id, table.command_name),
  })
);

export const restrictedCommands = sqliteTable(
  "restricted_commands",
  {
    id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
    guild_id: text("guild_id").notNull(),
    channel_id: text("channel_id").notNull(),
    command_name: text("command_name").notNull(),
    restriction_scope: text("restriction_scope").default("both"),
  },
  (table) => ({
    guildChannelCommandUnique: uniqueIndex("idx_restricted_commands_unique").on(
      table.guild_id,
      table.channel_id,
      table.command_name
    ),
  })
);

export const vcRoleConfig = sqliteTable("vc_role_config", {
  guild_id: text("guild_id").primaryKey(),
  role_id: text("role_id").notNull(),
  created_at: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
  updated_at: text("updated_at").default(sql`(CURRENT_TIMESTAMP)`),
});

export const autoRoleConfig = sqliteTable("auto_role_config", {
  guild_id: text("guild_id").primaryKey(),
  role_id: text("role_id").notNull(),
  created_at: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
  updated_at: text("updated_at").default(sql`(CURRENT_TIMESTAMP)`),
});

export const verificationConfig = sqliteTable("verification_config", {
  guild_id: text("guild_id").primaryKey(),
  enabled: integer("enabled", { mode: "boolean" }).default(false),
  mode: text("mode").default("button"),
  min_account_age_hours: integer("min_account_age_hours", { mode: "number" }).default(0),
  embed_title: text("embed_title").default("Server Verification"),
  embed_description: text("embed_description").default(
    "🛡️ Click the button below to verify and get access to the server."
  ),
  button_label: text("button_label").default("Verify Access"),
  button_emoji: text("button_emoji").default("✅"),
  verify_channel_id: text("verify_channel_id"),
  log_channel_id: text("log_channel_id"),
  verified_role_id: text("verified_role_id"),
  unverified_role_id: text("unverified_role_id"),
  created_at: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
  updated_at: text("updated_at").default(sql`(CURRENT_TIMESTAMP)`),
});

export const moderationLogConfig = sqliteTable("moderation_log_config", {
  guild_id: text("guild_id").primaryKey(),
  channel_id: text("channel_id").notNull(),
  enabled: integer("enabled", { mode: "boolean" }).default(true),
  events_config: text("events_config").default("{}"),
  created_at: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
  updated_at: text("updated_at").default(sql`(CURRENT_TIMESTAMP)`),
});

export const tagConfig = sqliteTable("tag_configs", {
  guild_id: text("guild_id").primaryKey(),
  tag: text("tag").notNull(),
  role_id: text("role_id").notNull(),
  created_at: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
  updated_at: text("updated_at").default(sql`(CURRENT_TIMESTAMP)`),
});

export const autoRoleRewardConfig = sqliteTable("auto_role_reward_config", {
  guild_id: text("guild_id").primaryKey(),
  enabled: integer("enabled").default(0),
  announcement_channel_id: text("announcement_channel_id"),
  top_chat_role_1: text("top_chat_role_1"),
  top_chat_role_2: text("top_chat_role_2"),
  top_chat_role_3: text("top_chat_role_3"),
  top_vc_role_1: text("top_vc_role_1"),
  top_vc_role_2: text("top_vc_role_2"),
  top_vc_role_3: text("top_vc_role_3"),
  created_at: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
  updated_at: text("updated_at").default(sql`(CURRENT_TIMESTAMP)`),
});

export const channelPermissionSnapshots = sqliteTable(
  "channel_permission_snapshots",
  {
    id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
    guild_id: text("guild_id").notNull(),
    channel_id: text("channel_id").notNull(),
    target_id: text("target_id").notNull(),
    permission_name: text("permission_name").notNull(),
    permission_value: integer("permission_value", { mode: "boolean" }),
    expires_at: text("expires_at"),
    created_at: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
    updated_at: text("updated_at").default(sql`(CURRENT_TIMESTAMP)`),
  },
  (table) => ({
    snapshotUnique: uniqueIndex("idx_channel_permission_snapshots_unique").on(
      table.guild_id,
      table.channel_id,
      table.target_id,
      table.permission_name
    ),
  })
);

export const systemMeta = sqliteTable("system_meta", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updated_at: text("updated_at").default(sql`(CURRENT_TIMESTAMP)`),
});

// 3. Moderation Models
export const tempbanConfig = sqliteTable("tempban_config", {
  guild_id: text("guild_id").primaryKey(),
  role_id: text("role_id").notNull(),
});

export const tempbanRecords = sqliteTable(
  "tempban_records",
  {
    id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
    guild_id: text("guild_id").notNull(),
    user_id: text("user_id").notNull(),
    moderator_id: text("moderator_id").notNull(),
    tempban_reason: text("tempban_reason"),
    active: integer("active", { mode: "boolean" }).default(true),
    expires_at: text("expires_at"),
    created_at: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
    updated_at: text("updated_at").default(sql`(CURRENT_TIMESTAMP)`),
  },
  (table) => ({
    guildUserUnique: uniqueIndex("idx_tempban_records_guild_user").on(table.guild_id, table.user_id),
    guildUserActiveIdx: index("idx_tempban_records_active").on(table.guild_id, table.user_id, table.active),
    guildActiveIdx: index("idx_tempban_records_guild_active").on(table.guild_id, table.active),
    expiresAtIdx: index("idx_tempban_records_expires_at").on(table.expires_at),
  })
);

export const warnings = sqliteTable(
  "warnings",
  {
    warn_id: integer("warn_id", { mode: "number" }).primaryKey({ autoIncrement: true }),
    guild_id: text("guild_id").notNull(),
    user_id: text("user_id").notNull(),
    moderator_id: text("moderator_id").notNull(),
    reason: text("reason").default("No reason provided"),
    created_at: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
    updated_at: text("updated_at").default(sql`(CURRENT_TIMESTAMP)`),
  },
  (table) => ({
    guildUserIdx: index("idx_warnings_guild_user").on(table.guild_id, table.user_id),
    guildUserCreatedIdx: index("idx_warnings_guild_user_created").on(
      table.guild_id,
      table.user_id,
      table.created_at
    ),
  })
);

export const punishmentRecords = sqliteTable(
  "punishment_records",
  {
    id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
    guild_id: text("guild_id").notNull(),
    user_id: text("user_id").notNull(),
    moderator_id: text("moderator_id").notNull(),
    action_type: text("action_type").notNull(),
    reason: text("reason").default("No reason provided"),
    duration_seconds: integer("duration_seconds", { mode: "number" }),
    created_at: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
    updated_at: text("updated_at").default(sql`(CURRENT_TIMESTAMP)`),
  },
  (table) => ({
    guildUserIdx: index("idx_punishment_records_guild_user").on(table.guild_id, table.user_id),
    actionTypeIdx: index("idx_punishment_records_action_type").on(table.action_type),
  })
);

export const warningPunishmentConfig = sqliteTable(
  "warning_punishment_config",
  {
    id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
    guild_id: text("guild_id").notNull(),
    warn_count: integer("warn_count", { mode: "number" }).notNull(),
    action_type: text("action_type").notNull(),
    duration: integer("duration", { mode: "number" }),
    created_at: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
    updated_at: text("updated_at").default(sql`(CURRENT_TIMESTAMP)`),
  },
  (table) => ({
    guildWarnCountUnique: uniqueIndex("idx_warning_punishment_unique").on(table.guild_id, table.warn_count),
  })
);

export const autoresponders = sqliteTable(
  "autoresponders",
  {
    responder_id: integer("responder_id", { mode: "number" }).primaryKey({ autoIncrement: true }),
    guild_id: text("guild_id").notNull(),
    trigger_phrase: text("trigger_phrase").notNull(),
    match_type: text("match_type").default("contains"),
    reply_content: text("reply_content"),
    is_embed: integer("is_embed", { mode: "boolean" }).default(false),
    embed_title: text("embed_title"),
    image_url: text("image_url"),
    enabled: integer("enabled", { mode: "boolean" }).default(true),
    ignore_bots: integer("ignore_bots", { mode: "boolean" }).default(true),
    delete_trigger: integer("delete_trigger", { mode: "boolean" }).default(false),
    cooldown: integer("cooldown", { mode: "number" }).default(0),
    created_at: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
    updated_at: text("updated_at").default(sql`(CURRENT_TIMESTAMP)`),
  },
  (table) => ({
    guildEnabledIdx: index("idx_autoresponders_guild_enabled").on(table.guild_id, table.enabled),
  })
);

export const autoresponderReactions = sqliteTable(
  "autoresponder_reactions",
  {
    id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
    responder_id: integer("responder_id", { mode: "number" }).notNull(),
    emoji: text("emoji").notNull(),
  },
  (table) => ({
    responderEmojiUnique: uniqueIndex("idx_autoresponder_reactions_unique").on(table.responder_id, table.emoji),
  })
);

// 4. Analytics Models
export const memberAnalytics = sqliteTable(
  "member_analytics",
  {
    id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
    guild_id: text("guild_id").notNull(),
    user_id: text("user_id").notNull(),
    joined_at: text("joined_at").default(sql`(CURRENT_TIMESTAMP)`),
    left_at: text("left_at"),
    is_active: integer("is_active", { mode: "boolean" }).default(true),
    total_messages: integer("total_messages", { mode: "number" }).default(0),
    weekly_messages: integer("weekly_messages", { mode: "number" }).default(0),
    total_vc_seconds: integer("total_vc_seconds", { mode: "number" }).default(0),
    weekly_vc_seconds: integer("weekly_vc_seconds", { mode: "number" }).default(0),
    active_vc_start: text("active_vc_start"),
    last_active_at: text("last_active_at"),
    created_at: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
    updated_at: text("updated_at").default(sql`(CURRENT_TIMESTAMP)`),
  },
  (table) => ({
    guildUserUnique: uniqueIndex("idx_member_analytics_guild_user").on(table.guild_id, table.user_id),
    guildActiveIdx: index("idx_member_analytics_active").on(table.guild_id, table.is_active),
    guildWeeklyMsgIdx: index("idx_member_analytics_weekly_msg").on(table.guild_id, table.weekly_messages),
    guildWeeklyVcIdx: index("idx_member_analytics_weekly_vc").on(table.guild_id, table.weekly_vc_seconds),
    guildTotalMsgIdx: index("idx_member_analytics_total_msg").on(table.guild_id, table.total_messages),
    guildTotalVcIdx: index("idx_member_analytics_total_vc").on(table.guild_id, table.total_vc_seconds),
  })
);

export const dailyActivitySnapshots = sqliteTable(
  "daily_activity_snapshots",
  {
    id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
    guild_id: text("guild_id").notNull(),
    date: text("date").notNull(),
    joins_count: integer("joins_count", { mode: "number" }).default(0),
    leaves_count: integer("leaves_count", { mode: "number" }).default(0),
    total_messages: integer("total_messages", { mode: "number" }).default(0),
    total_vc_seconds: integer("total_vc_seconds", { mode: "number" }).default(0),
    peak_active_members: integer("peak_active_members", { mode: "number" }).default(0),
  },
  (table) => ({
    guildDateUnique: uniqueIndex("idx_daily_activity_guild_date").on(table.guild_id, table.date),
  })
);

export const channelActivities = sqliteTable(
  "channel_activities",
  {
    id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
    guild_id: text("guild_id").notNull(),
    channel_id: text("channel_id").notNull(),
    date: text("date").notNull(),
    message_count: integer("message_count", { mode: "number" }).default(0),
    vc_seconds_spent: integer("vc_seconds_spent", { mode: "number" }).default(0),
  },
  (table) => ({
    guildChannelDateUnique: uniqueIndex("idx_channel_activities_unique").on(
      table.guild_id,
      table.channel_id,
      table.date
    ),
  })
);

export const hourlyActivities = sqliteTable(
  "hourly_activities",
  {
    id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
    guild_id: text("guild_id").notNull(),
    day_of_week: integer("day_of_week", { mode: "number" }).notNull(),
    hour_of_day: integer("hour_of_day", { mode: "number" }).notNull(),
    message_count: integer("message_count", { mode: "number" }).default(0),
    vc_seconds: integer("vc_seconds", { mode: "number" }).default(0),
  },
  (table) => ({
    guildDayHourUnique: uniqueIndex("idx_hourly_activities_unique").on(
      table.guild_id,
      table.day_of_week,
      table.hour_of_day
    ),
  })
);

export const supporterConfig = sqliteTable("supporter_config", {
  guild_id: text("guild_id").primaryKey(),
  enabled: integer("enabled", { mode: "boolean" }).default(false),
  vanity_text: text("vanity_text"),
  vanity_role_id: text("vanity_role_id"),
  vanity_channel_id: text("vanity_channel_id"),
  vanity_message: text("vanity_message"),
  clan_tag: text("clan_tag"),
  clan_role_id: text("clan_role_id"),
  clan_channel_id: text("clan_channel_id"),
  clan_message: text("clan_message"),
  created_at: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
  updated_at: text("updated_at").default(sql`(CURRENT_TIMESTAMP)`),
});

// 6. Message Studio Models
export const messageDrafts = sqliteTable(
  "message_drafts",
  {
    id: text("id").primaryKey(),
    guild_id: text("guild_id").notNull(),
    name: text("name").notNull().default("Untitled Message"),
    mode: text("mode").notNull().default("normal"),
    content: text("content").default(""),
    embeds: text("embeds").default("[]"),
    attachments: text("attachments").default("[]"),
    channel_id: text("channel_id"),
    reply_config: text("reply_config").default("{}"),
    mention_config: text("mention_config").default("{}"),
    created_by: text("created_by"),
    revision: integer("revision", { mode: "number" }).default(1),
    created_at: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
    updated_at: text("updated_at").default(sql`(CURRENT_TIMESTAMP)`),
  },
  (table) => ({
    guildIdx: index("idx_message_drafts_guild").on(table.guild_id),
  })
);

export const messageTemplates = sqliteTable(
  "message_templates",
  {
    id: text("id").primaryKey(),
    guild_id: text("guild_id").notNull(),
    name: text("name").notNull(),
    description: text("description").default(""),
    category: text("category").default("General"),
    mode: text("mode").notNull().default("normal"),
    content: text("content").default(""),
    embeds: text("embeds").default("[]"),
    attachments: text("attachments").default("[]"),
    mention_config: text("mention_config").default("{}"),
    created_by: text("created_by"),
    created_at: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
    updated_at: text("updated_at").default(sql`(CURRENT_TIMESTAMP)`),
  },
  (table) => ({
    guildIdx: index("idx_message_templates_guild").on(table.guild_id),
  })
);

export const messageHistory = sqliteTable(
  "message_history",
  {
    id: text("id").primaryKey(),
    guild_id: text("guild_id").notNull(),
    message_id: text("message_id"),
    channel_id: text("channel_id").notNull(),
    user_id: text("user_id"),
    source_type: text("source_type").default("direct"),
    source_id: text("source_id"),
    payload: text("payload").notNull(),
    status: text("status").notNull().default("delivered"),
    error_message: text("error_message"),
    created_at: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
    updated_at: text("updated_at").default(sql`(CURRENT_TIMESTAMP)`),
  },
  (table) => ({
    guildCreatedIdx: index("idx_message_history_guild").on(table.guild_id, table.created_at),
    guildMsgIdx: index("idx_message_history_msg").on(table.guild_id, table.message_id),
  })
);


export const welcomeConfig = sqliteTable("welcome_config", {
  guild_id: text("guild_id").primaryKey(),
  welcome_enabled: integer("welcome_enabled", { mode: "number" }).default(0),
  welcome_channel_id: text("welcome_channel_id"),
  welcome_message: text("welcome_message").default(
    "Hey {user}, welcome to **{server}**! Glad to have you here. You are member #{memberCount}! ðŸŽ‰"
  ),
  welcome_is_embed: integer("welcome_is_embed", { mode: "number" }).default(1),
  welcome_embed_title: text("welcome_embed_title").default("Welcome to {server}!"),
  welcome_embed_title_url: text("welcome_embed_title_url"),
  welcome_embed_author: text("welcome_embed_author"),
  welcome_embed_author_icon: text("welcome_embed_author_icon"),
  welcome_embed_author_url: text("welcome_embed_author_url"),
  welcome_embed_color: text("welcome_embed_color").default("#6366F1"),
  welcome_embed_footer: text("welcome_embed_footer").default("Member #{memberCount}"),
  welcome_embed_footer_icon: text("welcome_embed_footer_icon"),
  welcome_embed_fields: text("welcome_embed_fields").default("[]"),
  welcome_show_thumbnail: integer("welcome_show_thumbnail", { mode: "number" }).default(1),
  welcome_thumbnail_type: text("welcome_thumbnail_type").default("user_avatar"),
  welcome_thumbnail_custom: text("welcome_thumbnail_custom"),
  welcome_image_url: text("welcome_image_url"),
  welcome_ping_user: integer("welcome_ping_user", { mode: "number" }).default(1),
  welcome_delete_seconds: integer("welcome_delete_seconds", { mode: "number" }).default(0),
  welcome_show_timestamp: integer("welcome_show_timestamp", { mode: "number" }).default(1),
  welcome_trigger: text("welcome_trigger").default("join"),

  // Direct Message (DM) Onboarding
  dm_enabled: integer("dm_enabled", { mode: "number" }).default(0),
  dm_message: text("dm_message").default(
    "Welcome to **{server}**, {username}! Please check out our rules and enjoy your stay."
  ),
  dm_is_embed: integer("dm_is_embed", { mode: "number" }).default(0),
  dm_embed_title: text("dm_embed_title").default("Welcome to {server}!"),
  dm_embed_color: text("dm_embed_color").default("#10B981"),
  dm_embed_footer: text("dm_embed_footer").default("{server}"),
  dm_show_thumbnail: integer("dm_show_thumbnail", { mode: "number" }).default(1),

  // Leave / Goodbye Message
  leave_enabled: integer("leave_enabled", { mode: "number" }).default(0),
  leave_channel_id: text("leave_channel_id"),
  leave_message: text("leave_message").default(
    "## 🚪 {displayName} has left the server\n\n> 👤 **User:** {user} (`{username}`)\n> 🆔 **User ID:** `{id}`\n> 🏷️ **Normal Name:** {displayName}\n> 🛡️ **Roles:** {roles}\n> 👥 **Remaining Members:** #{memberCount}"
  ),
  leave_is_embed: integer("leave_is_embed", { mode: "number" }).default(1),
  leave_embed_title: text("leave_embed_title").default("🚪 Member Departed"),
  leave_embed_color: text("leave_embed_color").default("#F43F5E"),
  leave_embed_footer: text("leave_embed_footer").default("User ID: {id} • Remaining: {memberCount} members"),
  leave_show_thumbnail: integer("leave_show_thumbnail", { mode: "number" }).default(1),
  leave_image_url: text("leave_image_url"),
  leave_embed_author: text("leave_embed_author"),
  leave_embed_author_icon: text("leave_embed_author_icon"),
  leave_embed_fields: text("leave_embed_fields").default("[]"),

  // Auto-Roles
  autorole_enabled: integer("autorole_enabled", { mode: "number" }).default(0),
  join_role_ids: text("join_role_ids").default("[]"),
  bot_role_id: text("bot_role_id"),
  created_at: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
  updated_at: text("updated_at").default(sql`(CURRENT_TIMESTAMP)`),
});

export const confessionConfig = sqliteTable("confession_config", {
  guild_id: text("guild_id").primaryKey(),
  enabled: integer("enabled", { mode: "boolean" }).default(false),
  channel_id: text("channel_id"),
  review_channel_id: text("review_channel_id"),
  reviewer_role_ids: text("reviewer_role_ids").default("[]"),
  show_author_in_review: integer("show_author_in_review", { mode: "boolean" }).default(true),
  allow_anonymous: integer("allow_anonymous", { mode: "boolean" }).default(true),
  require_approval: integer("require_approval", { mode: "boolean" }).default(true),
  auto_thread: integer("auto_thread", { mode: "boolean" }).default(true),
  cooldown_seconds: integer("cooldown_seconds", { mode: "number" }).default(60),
  banned_words: text("banned_words").default(""),
  regex_filter: text("regex_filter").default(""),
  regex_filter_enabled: integer("regex_filter_enabled", { mode: "boolean" }).default(false),
  current_number: integer("current_number", { mode: "number" }).default(0),
  created_at: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
  updated_at: text("updated_at").default(sql`(CURRENT_TIMESTAMP)`),
});

export const confessions = sqliteTable(
  "confessions",
  {
    id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
    confession_number: integer("confession_number", { mode: "number" }).notNull(),
    guild_id: text("guild_id").notNull(),
    user_id: text("user_id").notNull(),
    user_tag: text("user_tag").notNull(),
    content: text("content").notNull(),
    image_url: text("image_url"),
    status: text("status").default("pending"),
    is_anonymous: integer("is_anonymous", { mode: "boolean" }).default(true),
    channel_id: text("channel_id"),
    message_id: text("message_id"),
    review_message_id: text("review_message_id"),
    reviewed_by: text("reviewed_by"),
    reviewed_by_tag: text("reviewed_by_tag"),
    rejection_reason: text("rejection_reason"),
    created_at: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
    updated_at: text("updated_at").default(sql`(CURRENT_TIMESTAMP)`),
  },
  (table) => ({
    guildNumberIdx: index("idx_confessions_guild_number").on(table.guild_id, table.confession_number),
    guildStatusIdx: index("idx_confessions_guild_status").on(table.guild_id, table.status),
  })
);

export const ticketConfig = sqliteTable("ticket_config", {
  guild_id: text("guild_id").primaryKey(),
  enabled: integer("enabled", { mode: "boolean" }).default(false),
  transcript_channel_id: text("transcript_channel_id"),
  category_id: text("category_id"),
  support_role_ids: text("support_role_ids").default("[]"),
  max_tickets_per_user: integer("max_tickets_per_user", { mode: "number" }).default(3),
  ticket_counter: integer("ticket_counter", { mode: "number" }).default(0),
  auto_close_hours: integer("auto_close_hours", { mode: "number" }).default(0),
  created_at: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
  updated_at: text("updated_at").default(sql`(CURRENT_TIMESTAMP)`),
});

export const ticketPanels = sqliteTable(
  "ticket_panels",
  {
    id: text("id").primaryKey(),
    guild_id: text("guild_id").notNull(),
    channel_id: text("channel_id"),
    message_id: text("message_id"),
    title: text("title").default("🎫 Support Tickets"),
    description: text("description").default("Need assistance? Click a button or select a department below."),
    color: text("color").default("#6366F1"),
    image_url: text("image_url"),
    button_text: text("button_text").default("Open Ticket"),
    button_emoji: text("button_emoji").default("📩"),
    button_style: text("button_style").default("Primary"),
    select_placeholder: text("select_placeholder").default("Select a ticket reason / category..."),
    enable_reason_categories: integer("enable_reason_categories", { mode: "boolean" }).default(false),
    reason_categories: text("reason_categories").default("[]"),
    created_at: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
    updated_at: text("updated_at").default(sql`(CURRENT_TIMESTAMP)`),
  },
  (table) => ({
    guildIdx: index("idx_ticket_panels_guild").on(table.guild_id),
  })
);

export const tickets = sqliteTable(
  "tickets",
  {
    id: text("id").primaryKey(),
    guild_id: text("guild_id").notNull(),
    ticket_number: integer("ticket_number", { mode: "number" }).notNull(),
    user_id: text("user_id").notNull(),
    user_tag: text("user_tag").notNull(),
    channel_id: text("channel_id"),
    panel_id: text("panel_id"),
    category_name: text("category_name").default("General Support"),
    reason: text("reason"),
    status: text("status").default("open"),
    claimed_by: text("claimed_by"),
    claimed_by_tag: text("claimed_by_tag"),
    closed_by: text("closed_by"),
    closed_by_tag: text("closed_by_tag"),
    close_reason: text("close_reason"),
    transcript_url: text("transcript_url"),
    created_at: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
    closed_at: text("closed_at"),
    updated_at: text("updated_at").default(sql`(CURRENT_TIMESTAMP)`),
  },
  (table) => ({
    guildNumberIdx: index("idx_tickets_guild_number").on(table.guild_id, table.ticket_number),
    guildStatusIdx: index("idx_tickets_guild_status").on(table.guild_id, table.status),
    channelIdx: index("idx_tickets_channel").on(table.channel_id),
  })
);