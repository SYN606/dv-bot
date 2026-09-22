import { createModel } from "./drizzleAdapter.js";
import {
  autoresponderReactions,
  autoresponders,
  punishmentRecords,
  tempbanConfig,
  tempbanRecords,
  warnings,
} from "../schema/sqlite.js";

export const TempbanConfig = createModel("TempbanConfig", tempbanConfig, "guild_id");
export const TempbanRecord = createModel("TempbanRecord", tempbanRecords, "id");
export const WarningRecord = createModel("WarningRecord", warnings, "warn_id");
export const PunishmentRecord = createModel("PunishmentRecord", punishmentRecords, "id");
export const AutoResponder = createModel("AutoResponder", autoresponders, "responder_id");
export const AutoResponderReaction = createModel("AutoResponderReaction", autoresponderReactions, "id");
