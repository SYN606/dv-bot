import { createModel } from "./drizzleAdapter.js";
import {
  antinukeSettings,
  antinukeTrustees,
  antinukeIncidents,
} from "../schema/sqlite.js";

export const AntinukeSettings = createModel("AntinukeSettings", antinukeSettings, "guild_id");
export const AntinukeTrustee = createModel("AntinukeTrustee", antinukeTrustees, "id");
export const AntinukeIncident = createModel("AntinukeIncident", antinukeIncidents, "id");
