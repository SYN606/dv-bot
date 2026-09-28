import { createModel } from "./drizzleAdapter.js";
import {
  channelActivities,
  dailyActivitySnapshots,
  hourlyActivities,
  memberAnalytics,
} from "../schema/sqlite.js";

export const MemberAnalytics = createModel("MemberAnalytics", memberAnalytics, "id");
export const DailyActivitySnapshot = createModel("DailyActivitySnapshot", dailyActivitySnapshots, "id");
export const ChannelActivity = createModel("ChannelActivity", channelActivities, "id");
export const HourlyActivity = createModel("HourlyActivity", hourlyActivities, "id");
