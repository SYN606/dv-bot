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
  role_id: text("role_id"),
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
  clan_role_id: text("clan_role_id"),
  clan_channel_id: text("clan_channel_id"),
  clan_message: text("clan_message"),
});
