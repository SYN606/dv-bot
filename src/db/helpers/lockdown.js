import { ChannelPermissionSnapshot } from "../models/index.js";
import { ensureGuild } from "./common.js";

export async function snapshotChannelPermissions(guildId, channelId, targetId, permissionName, permissionValue) {
  const gId = String(guildId);
  const cId = String(channelId);
  const tId = String(targetId);

  await ensureGuild(gId);

  await ChannelPermissionSnapshot.upsert({
    guild_id: gId,
    channel_id: cId,
    target_id: tId,
    permission_name: permissionName,
    permission_value: permissionValue,
  });
}

export async function createPermissionSnapshots(guildId, channelId, snapshots) {
  const gId = String(guildId);
  const cId = String(channelId);

  await ensureGuild(gId);

  const rows = snapshots.map(([targetId, permissionName, permissionValue]) => ({
    guild_id: gId,
    channel_id: cId,
    target_id: String(targetId),
    permission_name: permissionName,
    permission_value: permissionValue,
  }));

  for (const row of rows) {
    await ChannelPermissionSnapshot.upsert(row);
  }
}

export async function getChannelSnapshots(guildId, channelId) {
  return await ChannelPermissionSnapshot.findAll({
    where: {
      guild_id: String(guildId),
      channel_id: String(channelId),
    },
  });
}

export async function deleteChannelSnapshots(guildId, channelId) {
  return await ChannelPermissionSnapshot.destroy({
    where: {
      guild_id: String(guildId),
      channel_id: String(channelId),
    },
  });
}

export async function hasChannelSnapshots(guildId, channelId) {
  const count = await ChannelPermissionSnapshot.count({
    where: {
      guild_id: String(guildId),
      channel_id: String(channelId),
    },
  });
  return count > 0;
}
