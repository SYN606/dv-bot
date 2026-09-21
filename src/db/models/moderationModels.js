import { DataTypes, Model } from "sequelize";
import { sequelize } from "../index.js";

export class TempbanConfig extends Model {}
TempbanConfig.init(
  {
    guild_id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      allowNull: false,
    },
    role_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: "TempbanConfig",
    tableName: "tempban_config",
    timestamps: false,
  }
);

export class TempbanRecord extends Model {}
TempbanRecord.init(
  {
    id: {
      type: DataTypes.INTEGER,
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
    moderator_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    tempban_reason: {
      type: DataTypes.STRING(512),
      allowNull: true,
    },
    active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: "TempbanRecord",
    tableName: "tempban_records",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      {
        unique: true,
        fields: ["guild_id", "user_id"],
      },
      {
        fields: ["guild_id", "user_id", "active"],
      },
      {
        fields: ["guild_id", "active"],
      },
      {
        fields: ["expires_at"],
      },
    ],
  }
);

export class WarningRecord extends Model {}
WarningRecord.init(
  {
    warn_id: {
      type: DataTypes.INTEGER,
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
    moderator_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    reason: {
      type: DataTypes.STRING(512),
      defaultValue: "No reason provided",
    },
  },
  {
    sequelize,
    modelName: "WarningRecord",
    tableName: "warnings",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      {
        fields: ["guild_id", "user_id"],
      },
      {
        fields: ["guild_id", "user_id", "created_at"],
      },
    ],
  }
);

export class PunishmentRecord extends Model {}
PunishmentRecord.init(
  {
    id: {
      type: DataTypes.INTEGER,
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
    moderator_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    action_type: {
      type: DataTypes.STRING(32),
      allowNull: false,
    },
    reason: {
      type: DataTypes.STRING(512),
      defaultValue: "No reason provided",
    },
    duration_seconds: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: "PunishmentRecord",
    tableName: "punishment_records",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      {
        fields: ["guild_id", "user_id"],
      },
      {
        fields: ["action_type"],
      },
    ],
  }
);

export class AutoResponder extends Model {}
AutoResponder.init(
  {
    responder_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    guild_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    trigger_phrase: {
      type: DataTypes.STRING(256),
      allowNull: false,
    },
    match_type: {
      type: DataTypes.STRING(16),
      defaultValue: "contains",
    },
    reply_content: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    is_embed: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    embed_title: {
      type: DataTypes.STRING(256),
      allowNull: true,
    },
    image_url: {
      type: DataTypes.STRING(512),
      allowNull: true,
    },
    enabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    ignore_bots: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    delete_trigger: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    cooldown: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
  },
  {
    sequelize,
    modelName: "AutoResponder",
    tableName: "autoresponders",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      {
        fields: ["guild_id", "enabled"],
      },
    ],
  }
);

export class AutoResponderReaction extends Model {}
AutoResponderReaction.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    responder_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    emoji: {
      type: DataTypes.STRING(64),
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: "AutoResponderReaction",
    tableName: "autoresponder_reactions",
    timestamps: false,
    indexes: [
      {
        unique: true,
        fields: ["responder_id", "emoji"],
      },
    ],
  }
);
