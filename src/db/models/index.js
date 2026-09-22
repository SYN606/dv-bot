import {
  AdminRole,
  AdminUser,
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
import { Op } from "./drizzleAdapter.js";

// Setup associations
AutoResponder.hasMany(AutoResponderReaction, {
  foreignKey: "responder_id",
  as: "reactions",
});
AutoResponderReaction.belongsTo(AutoResponder, {
  foreignKey: "responder_id",
});

export {
  Guild,
  User,
  RoleRestriction,
  ChannelRestriction,
  AdminRole,
  AdminUser,
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
  Op,
};
