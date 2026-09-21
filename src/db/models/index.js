import {
  AdminRole,
  ChannelRestriction,
  Guild,
  RoleRestriction,
  User,
} from "./coreModels.js";
import {
  AFK,
  AutoRoleRewardConfig,
  ChannelPermissionSnapshot,
  DisabledCommand,
  MediaOnlyChannel,
  ModerationLogConfig,
  RestrictedCommand,
  StickyMessage,
  TagConfig,
  VCRoleConfig,
  VerificationConfig,
} from "./featureModels.js";
import {
  AutoResponder,
  AutoResponderReaction,
  PunishmentRecord,
  TempbanConfig,
  TempbanRecord,
  WarningRecord,
} from "./moderationModels.js";
import {
  ChannelActivity,
  DailyActivitySnapshot,
  HourlyActivity,
  MemberAnalytics,
} from "./analyticsModels.js";

// --- Associations ---

// Core
Guild.hasMany(RoleRestriction, { foreignKey: "guild_id", onDelete: "CASCADE" });
RoleRestriction.belongsTo(Guild, { foreignKey: "guild_id" });

Guild.hasMany(ChannelRestriction, { foreignKey: "guild_id", onDelete: "CASCADE" });
ChannelRestriction.belongsTo(Guild, { foreignKey: "guild_id" });

Guild.hasMany(AdminRole, { foreignKey: "guild_id", onDelete: "CASCADE" });
AdminRole.belongsTo(Guild, { foreignKey: "guild_id" });

// Features
Guild.hasMany(AFK, { foreignKey: "guild_id", onDelete: "CASCADE" });
AFK.belongsTo(Guild, { foreignKey: "guild_id" });
User.hasMany(AFK, { foreignKey: "user_id", onDelete: "CASCADE" });
AFK.belongsTo(User, { foreignKey: "user_id" });

Guild.hasOne(VCRoleConfig, { foreignKey: "guild_id", onDelete: "CASCADE" });
VCRoleConfig.belongsTo(Guild, { foreignKey: "guild_id" });

Guild.hasMany(MediaOnlyChannel, { foreignKey: "guild_id", onDelete: "CASCADE" });
MediaOnlyChannel.belongsTo(Guild, { foreignKey: "guild_id" });

Guild.hasMany(StickyMessage, { foreignKey: "guild_id", onDelete: "CASCADE" });
StickyMessage.belongsTo(Guild, { foreignKey: "guild_id" });

Guild.hasMany(DisabledCommand, { foreignKey: "guild_id", onDelete: "CASCADE" });
DisabledCommand.belongsTo(Guild, { foreignKey: "guild_id" });

Guild.hasMany(RestrictedCommand, { foreignKey: "guild_id", onDelete: "CASCADE" });
RestrictedCommand.belongsTo(Guild, { foreignKey: "guild_id" });

Guild.hasOne(VerificationConfig, { foreignKey: "guild_id", onDelete: "CASCADE" });
VerificationConfig.belongsTo(Guild, { foreignKey: "guild_id" });

Guild.hasOne(ModerationLogConfig, { foreignKey: "guild_id", onDelete: "CASCADE" });
ModerationLogConfig.belongsTo(Guild, { foreignKey: "guild_id" });

Guild.hasMany(ChannelPermissionSnapshot, { foreignKey: "guild_id", onDelete: "CASCADE" });
ChannelPermissionSnapshot.belongsTo(Guild, { foreignKey: "guild_id" });

Guild.hasOne(TagConfig, { foreignKey: "guild_id", onDelete: "CASCADE" });
TagConfig.belongsTo(Guild, { foreignKey: "guild_id" });

Guild.hasOne(AutoRoleRewardConfig, { foreignKey: "guild_id", onDelete: "CASCADE" });
AutoRoleRewardConfig.belongsTo(Guild, { foreignKey: "guild_id" });

// Moderation
Guild.hasOne(TempbanConfig, { foreignKey: "guild_id", onDelete: "CASCADE" });
TempbanConfig.belongsTo(Guild, { foreignKey: "guild_id" });

Guild.hasMany(TempbanRecord, { foreignKey: "guild_id", onDelete: "CASCADE" });
TempbanRecord.belongsTo(Guild, { foreignKey: "guild_id" });
User.hasMany(TempbanRecord, { foreignKey: "user_id", onDelete: "CASCADE" });
TempbanRecord.belongsTo(User, { foreignKey: "user_id" });

Guild.hasMany(WarningRecord, { foreignKey: "guild_id", onDelete: "CASCADE" });
WarningRecord.belongsTo(Guild, { foreignKey: "guild_id" });
User.hasMany(WarningRecord, { foreignKey: "user_id", onDelete: "CASCADE" });
WarningRecord.belongsTo(User, { foreignKey: "user_id" });

Guild.hasMany(PunishmentRecord, { foreignKey: "guild_id", onDelete: "CASCADE" });
PunishmentRecord.belongsTo(Guild, { foreignKey: "guild_id" });
User.hasMany(PunishmentRecord, { foreignKey: "user_id", onDelete: "CASCADE" });
PunishmentRecord.belongsTo(User, { foreignKey: "user_id" });

Guild.hasMany(AutoResponder, { foreignKey: "guild_id", onDelete: "CASCADE" });
AutoResponder.belongsTo(Guild, { foreignKey: "guild_id" });

AutoResponder.hasMany(AutoResponderReaction, {
  foreignKey: "responder_id",
  onDelete: "CASCADE",
  as: "reactions",
});
AutoResponderReaction.belongsTo(AutoResponder, { foreignKey: "responder_id" });

// Analytics
Guild.hasMany(MemberAnalytics, { foreignKey: "guild_id", onDelete: "CASCADE" });
MemberAnalytics.belongsTo(Guild, { foreignKey: "guild_id" });
User.hasMany(MemberAnalytics, { foreignKey: "user_id", onDelete: "CASCADE" });
MemberAnalytics.belongsTo(User, { foreignKey: "user_id" });

Guild.hasMany(DailyActivitySnapshot, { foreignKey: "guild_id", onDelete: "CASCADE" });
DailyActivitySnapshot.belongsTo(Guild, { foreignKey: "guild_id" });

Guild.hasMany(ChannelActivity, { foreignKey: "guild_id", onDelete: "CASCADE" });
ChannelActivity.belongsTo(Guild, { foreignKey: "guild_id" });

Guild.hasMany(HourlyActivity, { foreignKey: "guild_id", onDelete: "CASCADE" });
HourlyActivity.belongsTo(Guild, { foreignKey: "guild_id" });

export {
  Guild,
  User,
  RoleRestriction,
  ChannelRestriction,
  AdminRole,
  AFK,
  VCRoleConfig,
  MediaOnlyChannel,
  StickyMessage,
  DisabledCommand,
  RestrictedCommand,
  VerificationConfig,
  ModerationLogConfig,
  ChannelPermissionSnapshot,
  TagConfig,
  AutoRoleRewardConfig,
  TempbanConfig,
  TempbanRecord,
  WarningRecord,
  PunishmentRecord,
  AutoResponder,
  AutoResponderReaction,
  MemberAnalytics,
  DailyActivitySnapshot,
  ChannelActivity,
  HourlyActivity,
};
