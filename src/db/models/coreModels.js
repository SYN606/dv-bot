import { createModel } from "./drizzleAdapter.js";
import {
  adminRoles,
  adminUsers,
  channelRestrictions,
  guilds,
  roleRestrictions,
  users,
} from "../schema/sqlite.js";

export const Guild = createModel("Guild", guilds, "guild_id");
export const User = createModel("User", users, "user_id");
export const RoleRestriction = createModel("RoleRestriction", roleRestrictions, "id");
export const ChannelRestriction = createModel("ChannelRestriction", channelRestrictions, "id");
export const AdminRole = createModel("AdminRole", adminRoles, "id");
export const AdminUser = createModel("AdminUser", adminUsers, "id");
