/**
 * Automation API
 * Sticky, Autoresponder, Media-Only, Commands, Supporter, AutoRole.
 */
export {
  // Sticky
  getSticky,
  saveSticky,
  deleteSticky,
  // Autoresponder
  getAutoresponders,
  saveAutoresponder,
  toggleAutoresponder,
  deleteAutoresponder,
  // Media-Only
  getMediaOnly,
  addMediaOnly,
  deleteMediaOnly,
  // Commands
  getCommands,
  toggleCommand,
  toggleCommandModule,
  // Supporter Rewards
  getSupporterConfig,
  setSupporterConfig,
  // AutoRole Rewards
  getAutoRoleConfig,
  setAutoRoleConfig,
} from "./client";
