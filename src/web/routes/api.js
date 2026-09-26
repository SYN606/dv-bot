import { Hono } from "hono";
import { requireAuth, requireGuildAdmin } from "../middleware/auth.js";
import { authRoutes } from "./authRoutes.js";
import { botRoutes } from "./botRoutes.js";
import { metaRoutes } from "./metaRoutes.js";
import { verificationRoutes } from "./verificationRoutes.js";
import { autoresponderRoutes } from "./autoresponderRoutes.js";
import { moderationRoutes } from "./moderationRoutes.js";
import { commandRoutes } from "./commandRoutes.js";
import { aclRoutes } from "./aclRoutes.js";
import { analyticsRoutes } from "./analyticsRoutes.js";
import { permissionsRoutes } from "./permissionsRoutes.js";
import { supporterRoutes } from "./supporterRoutes.js";
import { apiCache } from "./cache.js";

/**
 * Modular API Router
 * Aggregates all domain-specific route modules with in-memory TTL caching and auth guards.
 */
export const apiRouter = new Hono();

// 1. Public & Session Routes (no guild admin guard)
apiRouter.route("/", authRoutes);
apiRouter.route("/", botRoutes);

// 2. Guild Admin Security Guard (applied to all /guilds/:guildId/* endpoints)
apiRouter.use("/guilds/:guildId/*", requireAuth, requireGuildAdmin);

// 3. Domain Feature Sub-Routers
apiRouter.route("/", metaRoutes);
apiRouter.route("/", verificationRoutes);
apiRouter.route("/", autoresponderRoutes);
apiRouter.route("/", moderationRoutes);
apiRouter.route("/", commandRoutes);
apiRouter.route("/", aclRoutes);
apiRouter.route("/", analyticsRoutes);
apiRouter.route("/", permissionsRoutes);
apiRouter.route("/", supporterRoutes);

// Re-export cache utility for direct usage if needed
export { apiCache };
export default apiRouter;
