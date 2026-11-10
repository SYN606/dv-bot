import {
  type Client,
  type Guild,
  type GuildChannel,
  type Role,
  ChannelType,
  PermissionOverwrites,
} from "discord.js";
import { logger } from "../utils/logger.js";

export interface IChannelSnapshot {
  id: string;
  name: string;
  type: ChannelType;
  parentId: string | null;
  position: number;
  topic?: string | null;
  nsfw?: boolean;
  bitrate?: number;
  userLimit?: number;
  rateLimitPerUser?: number;
  permissionOverwrites: Array<{
    id: string;
    type: number;
    allow: string;
    deny: string;
  }>;
}

export interface IRoleSnapshot {
  id: string;
  name: string;
  color: number;
  hoist: boolean;
  position: number;
  permissions: string;
  mentionable: boolean;
}

export interface IGuildTopology {
  guildId: string;
  name: string;
  iconURL: string | null;
  vanityURLCode: string | null;
  channels: Map<string, IChannelSnapshot>;
  roles: Map<string, IRoleSnapshot>;
  lastSynced: number;
}

class TopologyMirrorService {
  private topologies = new Map<string, IGuildTopology>();

  /**
   * Hydrates the in-memory topology mirror across all guilds upon bot ready.
   */
  public hydrate(client: Client): void {
    let channelCount = 0;
    let roleCount = 0;

    for (const guild of client.guilds.cache.values()) {
      const topo = this.syncGuild(guild);
      channelCount += topo.channels.size;
      roleCount += topo.roles.size;
    }
  }

  /**
   * Synchronizes or refreshes the topology snapshot for a given guild.
   */
  public syncGuild(guild: Guild): IGuildTopology {
    const guildId = String(guild.id);
    const channels = new Map<string, IChannelSnapshot>();
    const roles = new Map<string, IRoleSnapshot>();

    // 1. Snapshot all channels
    for (const [cId, ch] of guild.channels.cache) {
      const channel = ch as GuildChannel;
      const overwrites: Array<{ id: string; type: number; allow: string; deny: string }> = [];

      if (channel.permissionOverwrites?.cache) {
        for (const [targetId, ow] of channel.permissionOverwrites.cache) {
          overwrites.push({
            id: targetId,
            type: ow.type,
            allow: ow.allow.bitfield.toString(),
            deny: ow.deny.bitfield.toString(),
          });
        }
      }

      channels.set(String(cId), {
        id: String(cId),
        name: channel.name,
        type: channel.type,
        parentId: channel.parentId || null,
        position: channel.rawPosition ?? 0,
        topic: (channel as any).topic || null,
        nsfw: Boolean((channel as any).nsfw),
        bitrate: (channel as any).bitrate || undefined,
        userLimit: (channel as any).userLimit || undefined,
        rateLimitPerUser: (channel as any).rateLimitPerUser || 0,
        permissionOverwrites: overwrites,
      });
    }

    // 2. Snapshot all roles
    for (const [rId, r] of guild.roles.cache) {
      roles.set(String(rId), {
        id: String(rId),
        name: r.name,
        color: r.color,
        hoist: r.hoist,
        position: r.position,
        permissions: r.permissions.bitfield.toString(),
        mentionable: r.mentionable,
      });
    }

    const topology: IGuildTopology = {
      guildId,
      name: guild.name,
      iconURL: guild.iconURL() || null,
      vanityURLCode: guild.vanityURLCode || null,
      channels,
      roles,
      lastSynced: Date.now(),
    };

    this.topologies.set(guildId, topology);
    return topology;
  }

  /**
   * Retrieves the in-memory topology snapshot for a guild.
   */
  public getTopology(guildId: string): IGuildTopology | null {
    return this.topologies.get(String(guildId)) || null;
  }

  public getChannelSnapshot(guildId: string, channelId: string): IChannelSnapshot | null {
    const topo = this.topologies.get(String(guildId));
    return topo?.channels.get(String(channelId)) || null;
  }

  public getRoleSnapshot(guildId: string, roleId: string): IRoleSnapshot | null {
    const topo = this.topologies.get(String(guildId));
    return topo?.roles.get(String(roleId)) || null;
  }

  public updateChannel(channel: GuildChannel): void {
    if (!channel?.guild) return;
    const guildId = String(channel.guild.id);
    let topo = this.topologies.get(guildId);
    if (!topo) topo = this.syncGuild(channel.guild);

    const overwrites: Array<{ id: string; type: number; allow: string; deny: string }> = [];
    if (channel.permissionOverwrites?.cache) {
      for (const [targetId, ow] of channel.permissionOverwrites.cache) {
        overwrites.push({
          id: targetId,
          type: ow.type,
          allow: ow.allow.bitfield.toString(),
          deny: ow.deny.bitfield.toString(),
        });
      }
    }

    topo.channels.set(String(channel.id), {
      id: String(channel.id),
      name: channel.name,
      type: channel.type,
      parentId: channel.parentId || null,
      position: channel.rawPosition ?? 0,
      topic: (channel as any).topic || null,
      nsfw: Boolean((channel as any).nsfw),
      bitrate: (channel as any).bitrate || undefined,
      userLimit: (channel as any).userLimit || undefined,
      rateLimitPerUser: (channel as any).rateLimitPerUser || 0,
      permissionOverwrites: overwrites,
    });
  }

  public updateRole(role: Role): void {
    if (!role?.guild) return;
    const guildId = String(role.guild.id);
    let topo = this.topologies.get(guildId);
    if (!topo) topo = this.syncGuild(role.guild);

    topo.roles.set(String(role.id), {
      id: String(role.id),
      name: role.name,
      color: role.color,
      hoist: role.hoist,
      position: role.position,
      permissions: role.permissions.bitfield.toString(),
      mentionable: role.mentionable,
    });
  }

  public removeChannel(guildId: string, channelId: string): void {
    const topo = this.topologies.get(String(guildId));
    if (topo) {
      topo.channels.delete(String(channelId));
    }
  }

  public removeRole(guildId: string, roleId: string): void {
    const topo = this.topologies.get(String(guildId));
    if (topo) {
      topo.roles.delete(String(roleId));
    }
  }

  public removeGuild(guildId: string): void {
    this.topologies.delete(String(guildId));
  }

  /**
   * Recreates an atomically deleted channel with identical name, parent, and overwrites.
   */
  public async restoreChannel(guild: Guild, snapshot: IChannelSnapshot): Promise<GuildChannel | null> {
    if (!guild || !snapshot) return null;

    try {
      const overwrites = snapshot.permissionOverwrites.map((ow) => ({
        id: ow.id,
        type: ow.type,
        allow: BigInt(ow.allow),
        deny: BigInt(ow.deny),
      }));

      const options: Record<string, any> = {
        name: snapshot.name,
        type: snapshot.type,
        parent: snapshot.parentId && guild.channels.cache.has(snapshot.parentId) ? snapshot.parentId : undefined,
        permissionOverwrites: overwrites,
        reason: "[DV-BOT ANTI-NUKE] Auto-recovering illegally deleted channel.",
      };

      if (snapshot.topic) options.topic = snapshot.topic;
      if (snapshot.nsfw !== undefined) options.nsfw = snapshot.nsfw;
      if (snapshot.bitrate) options.bitrate = snapshot.bitrate;
      if (snapshot.userLimit) options.userLimit = snapshot.userLimit;
      if (snapshot.rateLimitPerUser) options.rateLimitPerUser = snapshot.rateLimitPerUser;

      const recreated: any = await guild.channels.create(options as any);
      logger.info(`[TOPOLOGY RECOVERY] Restored channel #${snapshot.name} (${snapshot.id} -> ${recreated.id}) in guild ${guild.id}`);

      // Track the new channel in mirror
      this.updateChannel(recreated);
      return recreated;
    } catch (err: any) {
      logger.error(`[TOPOLOGY RECOVERY] Failed recreating channel #${snapshot.name}:`, err.message);
      return null;
    }
  }

  /**
   * Recreates an atomically deleted role with identical color, hoist, and permissions.
   */
  public async restoreRole(guild: Guild, snapshot: IRoleSnapshot): Promise<Role | null> {
    if (!guild || !snapshot) return null;

    try {
      const recreated = await guild.roles.create({
        name: snapshot.name,
        color: snapshot.color,
        hoist: snapshot.hoist,
        permissions: BigInt(snapshot.permissions),
        mentionable: snapshot.mentionable,
        reason: "[DV-BOT ANTI-NUKE] Auto-recovering illegally deleted role.",
      });

      logger.info(`[TOPOLOGY RECOVERY] Restored role @${snapshot.name} (${snapshot.id} -> ${recreated.id}) in guild ${guild.id}`);
      this.updateRole(recreated);
      return recreated;
    } catch (err: any) {
      logger.error(`[TOPOLOGY RECOVERY] Failed recreating role @${snapshot.name}:`, err.message);
      return null;
    }
  }
}

export const TOPOLOGY_MIRROR = new TopologyMirrorService();
export const topologyMirror = TOPOLOGY_MIRROR;
export default TOPOLOGY_MIRROR;
