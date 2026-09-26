import { Events } from "discord.js";
import { checkGuildTag } from "../handlers/supporterHandler.js";

export default {
  name: Events.GuildMemberUpdate,
  once: false,
  async execute(oldMember, newMember) {
    const avatarChanged = oldMember.avatar !== newMember.avatar;
    const bannerChanged = oldMember.banner !== newMember.banner;
    
    // Guild Member Updates can also contain clan/identity changes at the guild level
    if (avatarChanged || bannerChanged) {
      await checkGuildTag(newMember);
    }
  },
};
