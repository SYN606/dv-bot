import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import type * as schema from "../db/schema/sqlite.js";

export type Guild = InferSelectModel<typeof schema.guilds>;
export type NewGuild = InferInsertModel<typeof schema.guilds>;

export type User = InferSelectModel<typeof schema.users>;
export type NewUser = InferInsertModel<typeof schema.users>;

export type RoleRestriction = InferSelectModel<typeof schema.roleRestrictions>;
export type NewRoleRestriction = InferInsertModel<typeof schema.roleRestrictions>;

export type ChannelRestriction = InferSelectModel<typeof schema.channelRestrictions>;
export type NewChannelRestriction = InferInsertModel<typeof schema.channelRestrictions>;

export type AdminRole = InferSelectModel<typeof schema.adminRoles>;
export type NewAdminRole = InferInsertModel<typeof schema.adminRoles>;

export type AdminUser = InferSelectModel<typeof schema.adminUsers>;
export type NewAdminUser = InferInsertModel<typeof schema.adminUsers>;

export type AFKRecord = InferSelectModel<typeof schema.afk>;
export type NewAFKRecord = InferInsertModel<typeof schema.afk>;

export type MediaOnlyChannel = InferSelectModel<typeof schema.mediaOnlyChannels>;
export type NewMediaOnlyChannel = InferInsertModel<typeof schema.mediaOnlyChannels>;

export type StickyMessage = InferSelectModel<typeof schema.stickyMessages>;
export type NewStickyMessage = InferInsertModel<typeof schema.stickyMessages>;

export type AutoResponder = InferSelectModel<typeof schema.autoresponders>;
export type NewAutoResponder = InferInsertModel<typeof schema.autoresponders>;

export type AutoResponderReaction = InferSelectModel<typeof schema.autoresponderReactions>;
export type NewAutoResponderReaction = InferInsertModel<typeof schema.autoresponderReactions>;

export type WelcomeConfig = InferSelectModel<typeof schema.welcomeConfig>;
export type NewWelcomeConfig = InferInsertModel<typeof schema.welcomeConfig>;

export type VerificationConfig = InferSelectModel<typeof schema.verificationConfig>;
export type NewVerificationConfig = InferInsertModel<typeof schema.verificationConfig>;

export type SupporterConfig = InferSelectModel<typeof schema.supporterConfig>;
export type NewSupporterConfig = InferInsertModel<typeof schema.supporterConfig>;

export type Warning = InferSelectModel<typeof schema.warnings>;
export type NewWarning = InferInsertModel<typeof schema.warnings>;

export type WarningPunishmentConfig = InferSelectModel<typeof schema.warningPunishmentConfig>;
export type NewWarningPunishmentConfig = InferInsertModel<typeof schema.warningPunishmentConfig>;

export type TempbanRecord = InferSelectModel<typeof schema.tempbanRecords>;
export type NewTempbanRecord = InferInsertModel<typeof schema.tempbanRecords>;
