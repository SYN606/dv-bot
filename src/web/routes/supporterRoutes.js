import { Hono } from "hono";
import { getSupporterConfig, setSupporterConfig } from "../../db/helpers/supporter.js";

export const supporterRoutes = new Hono();

supporterRoutes.get("/guilds/:guildId/supporter", async (c) => {
  const guildId = c.req.param("guildId");
  const config = await getSupporterConfig(guildId);
  return c.json(config || {
    enabled: false,
    vanity_text: "",
    vanity_role_id: "",
    vanity_channel_id: "",
    vanity_message: "",
    clan_role_id: "",
    clan_channel_id: "",
    clan_message: ""
  });
});

supporterRoutes.put("/guilds/:guildId/supporter", async (c) => {
  const guildId = c.req.param("guildId");
  const body = await c.req.json().catch(() => ({}));
  const updated = await setSupporterConfig(guildId, body);
  return c.json({ success: true, config: updated });
});
