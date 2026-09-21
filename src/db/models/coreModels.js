import { DataTypes, Model } from "sequelize";
import { sequelize } from "../index.js";

export class Guild extends Model {}
Guild.init(
  {
    guild_id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: "Guild",
    tableName: "guilds",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

export class User extends Model {}
User.init(
  {
    user_id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: "User",
    tableName: "users",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

export class RoleRestriction extends Model {}
RoleRestriction.init(
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
    role_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    feature: {
      type: DataTypes.STRING(32),
      allowNull: false,
    },
    restriction_type: {
      type: DataTypes.STRING(16),
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: "RoleRestriction",
    tableName: "role_restrictions",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      {
        unique: true,
        fields: ["guild_id", "role_id", "feature", "restriction_type"],
      },
      {
        fields: ["guild_id", "feature", "restriction_type"],
      },
    ],
  }
);

export class ChannelRestriction extends Model {}
ChannelRestriction.init(
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
    feature: {
      type: DataTypes.STRING(32),
      allowNull: false,
    },
    restriction_type: {
      type: DataTypes.STRING(16),
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: "ChannelRestriction",
    tableName: "channel_restrictions",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      {
        unique: true,
        fields: ["guild_id", "channel_id", "feature", "restriction_type"],
      },
      {
        fields: ["guild_id", "feature", "restriction_type"],
      },
    ],
  }
);

export class AdminRole extends Model {}
AdminRole.init(
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
    role_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: "AdminRole",
    tableName: "admin_roles",
    timestamps: false,
    indexes: [
      {
        unique: true,
        fields: ["guild_id", "role_id"],
      },
    ],
  }
);
