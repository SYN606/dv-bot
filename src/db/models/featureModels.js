import { DataTypes, Model } from "sequelize";
import { sequelize } from "../index.js";

export class AFK extends Model {}
AFK.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    guild_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    user_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    afk_reason: {
      type: DataTypes.STRING(256),
      allowNull: false,
    },
    since: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    is_global: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    original_nickname: {
      type: DataTypes.STRING(32),
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: "AFK",
    tableName: "afk",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      { fields: ["user_id", "is_global"] },
      { fields: ["guild_id", "user_id"] },
    ],
  }
);

export class MediaOnlyChannel extends Model {}
MediaOnlyChannel.init(
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
    channel_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    sticky_message_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    whitelist_role_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    image_only: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    auto_mute: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    nsfw_bypass: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    sequelize,
    modelName: "MediaOnlyChannel",
    tableName: "media_only_channels",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      {
        unique: true,
        fields: ["guild_id", "channel_id"],
      },
    ],
  }
);

export class StickyMessage extends Model {}
StickyMessage.init(
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
    channel_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    sticky_content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    last_message_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    counter: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
  },
  {
    sequelize,
    modelName: "StickyMessage",
    tableName: "sticky_messages",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      {
        unique: true,
        fields: ["guild_id", "channel_id"],
      },
    ],
  }
);

export class DisabledCommand extends Model {}
DisabledCommand.init(
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
    command_name: {
      type: DataTypes.STRING(64),
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: "DisabledCommand",
    tableName: "disabled_commands",
    timestamps: false,
    indexes: [
      {
        unique: true,
        fields: ["guild_id", "command_name"],
      },
    ],
  }
);

export class RestrictedCommand extends Model {}
RestrictedCommand.init(
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
    channel_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    command_name: {
      type: DataTypes.STRING(64),
      allowNull: false,
    },
    restriction_scope: {
      type: DataTypes.STRING(16),
      defaultValue: "both",
    },
  },
  {
    sequelize,
    modelName: "RestrictedCommand",
    tableName: "restricted_commands",
    timestamps: false,
    indexes: [
      {
        unique: true,
        fields: ["guild_id", "channel_id", "command_name"],
      },
    ],
  }
);

export class VCRoleConfig extends Model {}
VCRoleConfig.init(
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
    modelName: "VCRoleConfig",
    tableName: "vc_role_config",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

export class VerificationConfig extends Model {}
VerificationConfig.init(
  {
    guild_id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      allowNull: false,
    },
    verify_channel_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    log_channel_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    verified_role_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    unverified_role_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: "VerificationConfig",
    tableName: "verification_config",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

export class ModerationLogConfig extends Model {}
ModerationLogConfig.init(
  {
    guild_id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      allowNull: false,
    },
    channel_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    enabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    sequelize,
    modelName: "ModerationLogConfig",
    tableName: "moderation_log_config",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

export class TagConfig extends Model {}
TagConfig.init(
  {
    guild_id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      allowNull: false,
    },
    tag: {
      type: DataTypes.STRING(32),
      allowNull: false,
    },
    role_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: "TagConfig",
    tableName: "tag_configs",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

export class AutoRoleRewardConfig extends Model {}
AutoRoleRewardConfig.init(
  {
    guild_id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      allowNull: false,
    },
    announcement_channel_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    top_chat_role_1: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    top_chat_role_2: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    top_chat_role_3: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    top_vc_role_1: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    top_vc_role_2: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    top_vc_role_3: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: "AutoRoleRewardConfig",
    tableName: "auto_role_reward_config",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

export class ChannelPermissionSnapshot extends Model {}
ChannelPermissionSnapshot.init(
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
    channel_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    target_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    permission_name: {
      type: DataTypes.STRING(64),
      allowNull: false,
    },
    permission_value: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: "ChannelPermissionSnapshot",
    tableName: "channel_permission_snapshots",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      {
        unique: true,
        fields: ["guild_id", "channel_id", "target_id", "permission_name"],
      },
    ],
  }
);
