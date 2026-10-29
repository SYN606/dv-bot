import { Events } from "discord.js";
import { checkGuildTag, clearUserClanCache } from "../handlers/supporterHandler.js";

export default {
  name: Events.GuildMemberUpdate,
  once: false,
  async execute(client, oldMember, newMember) {
    if (!oldMember || !newMember) return;
    const avatarChanged = oldMember.avatar !== newMember.avatar;
    const bannerChanged = oldMember.banner !== newMember.banner;
    const nicknameChanged = oldMember.nickname !== newMember.nickname;
    const displayNameChanged = oldMember.displayName !== newMember.displayName;

    // Guild Member Updates can also contain clan/identity or name changes
    if (avatarChanged || bannerChanged || nicknameChanged || displayNameChanged) {
      clearUserClanCache(newMember.id);
      await checkGuildTag(newMember, true);
    }
  },
};
