import { getDb } from '../index.js';
import { warningPunishmentConfig } from '../schema/sqlite.js';
import { and, eq } from 'drizzle-orm';

export async function getWarningPunishmentConfig(guildId, warnCount) {
  const db = getDb();
  return db
    .select()
    .from(warningPunishmentConfig)
    .where(and(eq(warningPunishmentConfig.guild_id, String(guildId)), eq(warningPunishmentConfig.warn_count, Number(warnCount))))
    .get() ?? null;
}

export async function getAllWarningPunishmentConfigs(guildId) {
  const db = getDb();
  return db
    .select()
    .from(warningPunishmentConfig)
    .where(eq(warningPunishmentConfig.guild_id, String(guildId)))
    .orderBy(warningPunishmentConfig.warn_count)
    .all();
}

export async function setWarningPunishmentConfig(guildId, warnCount, actionType, duration = null) {
  const db = getDb();
  const gId = String(guildId);
  const count = Number(warnCount);

  const existing = db
    .select()
    .from(warningPunishmentConfig)
    .where(and(eq(warningPunishmentConfig.guild_id, gId), eq(warningPunishmentConfig.warn_count, count)))
    .get();

  if (existing) {
    return db
      .update(warningPunishmentConfig)
      .set({ action_type: actionType, duration, updated_at: new Date().toISOString() })
      .where(and(eq(warningPunishmentConfig.guild_id, gId), eq(warningPunishmentConfig.warn_count, count)))
      .returning()
      .get();
  }

  return db
    .insert(warningPunishmentConfig)
    .values({ guild_id: gId, warn_count: count, action_type: actionType, duration })
    .returning()
    .get();
}

export async function removeWarningPunishmentConfig(guildId, warnCount) {
  const db = getDb();
  const result = db
    .delete(warningPunishmentConfig)
    .where(and(eq(warningPunishmentConfig.guild_id, String(guildId)), eq(warningPunishmentConfig.warn_count, Number(warnCount))))
    .run();
  return (result?.changes ?? 0) > 0;
}
