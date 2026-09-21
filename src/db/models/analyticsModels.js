import { DataTypes, Model } from "sequelize";
import { sequelize } from "../index.js";

export class MemberAnalytics extends Model {}
MemberAnalytics.init(
  {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    guild_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    user_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    joined_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    left_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    total_messages: {
      type: DataTypes.BIGINT,
      defaultValue: 0,
    },
    weekly_messages: {
      type: DataTypes.BIGINT,
      defaultValue: 0,
    },
    total_vc_seconds: {
      type: DataTypes.BIGINT,
      defaultValue: 0,
    },
    weekly_vc_seconds: {
      type: DataTypes.BIGINT,
      defaultValue: 0,
    },
    active_vc_start: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    last_active_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: "MemberAnalytics",
    tableName: "member_analytics",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      {
        unique: true,
        fields: ["guild_id", "user_id"],
      },
      { fields: ["guild_id", "is_active"] },
      { fields: ["guild_id", "weekly_messages"] },
      { fields: ["guild_id", "weekly_vc_seconds"] },
      { fields: ["guild_id", "total_messages"] },
      { fields: ["guild_id", "total_vc_seconds"] },
    ],
  }
);

export class DailyActivitySnapshot extends Model {}
DailyActivitySnapshot.init(
  {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    guild_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    joins_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    leaves_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    total_messages: {
      type: DataTypes.BIGINT,
      defaultValue: 0,
    },
    total_vc_seconds: {
      type: DataTypes.BIGINT,
      defaultValue: 0,
    },
    peak_active_members: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
  },
  {
    sequelize,
    modelName: "DailyActivitySnapshot",
    tableName: "daily_activity_snapshots",
    timestamps: false,
    indexes: [
      {
        unique: true,
        fields: ["guild_id", "date"],
      },
    ],
  }
);

export class ChannelActivity extends Model {}
ChannelActivity.init(
  {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    guild_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    channel_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    message_count: {
      type: DataTypes.BIGINT,
      defaultValue: 0,
    },
    vc_seconds_spent: {
      type: DataTypes.BIGINT,
      defaultValue: 0,
    },
  },
  {
    sequelize,
    modelName: "ChannelActivity",
    tableName: "channel_activities",
    timestamps: false,
    indexes: [
      {
        unique: true,
        fields: ["guild_id", "channel_id", "date"],
      },
    ],
  }
);

export class HourlyActivity extends Model {}
HourlyActivity.init(
  {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    guild_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    day_of_week: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    hour_of_day: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    message_count: {
      type: DataTypes.BIGINT,
      defaultValue: 0,
    },
    vc_seconds: {
      type: DataTypes.BIGINT,
      defaultValue: 0,
    },
  },
  {
    sequelize,
    modelName: "HourlyActivity",
    tableName: "hourly_activities",
    timestamps: false,
    indexes: [
      {
        unique: true,
        fields: ["guild_id", "day_of_week", "hour_of_day"],
      },
    ],
  }
);
