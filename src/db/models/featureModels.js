import { createModel } from "./drizzleAdapter.js";
import {
  afk,
  autoRoleRewardConfig,
  channelPermissionSnapshots,
  disabledCommands,
  mediaOnlyChannels,
  moderationLogConfig,
  restrictedCommands,
  stickyMessages,
  tagConfig,
  vcRoleConfig,
  verificationConfig,
} from "../schema/sqlite.js";

export const AFK = createModel("AFK", afk, "id");
export const MediaOnlyChannel = createModel("MediaOnlyChannel", mediaOnlyChannels, "id");
export const StickyMessage = createModel("StickyMessage", stickyMessages, "id");
export const DisabledCommand = createModel("DisabledCommand", disabledCommands, "id");
export const RestrictedCommand = createModel("RestrictedCommand", restrictedCommands, "id");
export const VCRoleConfig = createModel("VCRoleConfig", vcRoleConfig, "guild_id");
export const VerificationConfig = createModel("VerificationConfig", verificationConfig, "guild_id");
export const ModerationLogConfig = createModel("ModerationLogConfig", moderationLogConfig, "guild_id");
export const TagConfig = createModel("TagConfig", tagConfig, "guild_id");
export const AutoRoleRewardConfig = createModel("AutoRoleRewardConfig", autoRoleRewardConfig, "guild_id");
export const ChannelPermissionSnapshot = createModel(
  "ChannelPermissionSnapshot",
  channelPermissionSnapshots,
  "id"
);
