import { Hono } from "hono";
import { 
  getAutoRoleConfig, 
  setAutoRoleConfig,
  getAutoRoleBlacklist,
  addAutoRoleBlacklist,
  removeAutoRoleBlacklist
} from "../../db/helpers/autorole.js";

export const autoroleRoutes = new Hono();

autoroleRoutes.get("/guilds/:guildId/autorole", async (c) => {
  const guildId = c.req.param("guildId");
  const config = await getAutoRoleConfig(guildId) || {
    enabled: 0,
    announcement_channel_id: "",
    top_chat_role_1: "",
    top_chat_role_2: "",
    top_chat_role_3: "",
    top_vc_role_1: "",
    top_vc_role_2: "",
    top_vc_role_3: "",
  };
  const blacklist = await getAutoRoleBlacklist(guildId);
  return c.json({ config, blacklist });
});

autoroleRoutes.put("/guilds/:guildId/autorole", async (c) => {
  const guildId = c.req.param("guildId");
  const body = await c.req.json().catch(() => ({}));
  
  if (body.config) {
    await setAutoRoleConfig(guildId, body.config);
  }
  
  if (body.blacklist_add && Array.isArray(body.blacklist_add)) {
    for (const roleId of body.blacklist_add) {
      await addAutoRoleBlacklist(guildId, roleId);
    }
  }
  
  if (body.blacklist_remove && Array.isArray(body.blacklist_remove)) {
    for (const roleId of body.blacklist_remove) {
      await removeAutoRoleBlacklist(guildId, roleId);
    }
  }

  const updatedConfig = await getAutoRoleConfig(guildId);
  const updatedBlacklist = await getAutoRoleBlacklist(guildId);
  return c.json({ success: true, config: updatedConfig, blacklist: updatedBlacklist });
});
