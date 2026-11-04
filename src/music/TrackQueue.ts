import { CONFIG } from "../config.js";

/**
 * Loop Modes for Music Queue
 */
export const LoopMode = {
  OFF: "off",
  TRACK: "track",
  QUEUE: "queue",
} as const;

export type LoopModeType = (typeof LoopMode)[keyof typeof LoopMode];

export interface ITrackRequester {
  id: string;
  username: string;
  avatar: string | null;
}

export interface ITrackInfo {
  identifier: string;
  isSeekable: boolean;
  author: string;
  length: number;
  isStream: boolean;
  position: number;
  title: string;
  uri: string;
  artworkUrl: string | null;
  sourceName: string;
}

export interface IFormattedTrack {
  encoded: string;
  info: ITrackInfo;
  requester: ITrackRequester | null;
  addedAt: number;
  formattedDuration: string;
  [key: string]: any;
}

/**
 * Formats milliseconds into human-readable mm:ss or hh:mm:ss
 */
export function formatDuration(ms?: number | null): string {
  if (!ms || isNaN(ms)) return "00:00";
  const totalSec = Math.floor(ms / 1000);
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;

  if (hours > 0) {
    return `${hours}:${minutes < 10 ? "0" : ""}${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  }
  return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
}

/**
 * Normalizes Lavalink track objects into a consistent representation
 */
export function formatTrack(rawTrack: any, requester: any = null): IFormattedTrack | null {
  if (!rawTrack) return null;

  // If already normalized
  if (rawTrack.info && (rawTrack.encoded || rawTrack.track)) {
    return {
      encoded: rawTrack.encoded || rawTrack.track,
      info: {
        identifier: rawTrack.info.identifier || "",
        isSeekable: Boolean(rawTrack.info.isSeekable ?? true),
        author: rawTrack.info.author || "Unknown Artist",
        length: Number(rawTrack.info.length) || 0,
        isStream: Boolean(rawTrack.info.isStream),
        position: Number(rawTrack.info.position) || 0,
        title: rawTrack.info.title || "Unknown Title",
        uri: rawTrack.info.uri || "",
        artworkUrl: rawTrack.info.artworkUrl || rawTrack.thumbnail || null,
        sourceName: rawTrack.info.sourceName || "unknown",
      },
      requester: rawTrack.requester || (requester
        ? {
            id: requester.id,
            username: requester.username || requester.tag || "User",
            avatar: typeof requester.displayAvatarURL === "function"
              ? requester.displayAvatarURL({ dynamic: true })
              : requester.avatar || null,
          }
        : null),
      addedAt: rawTrack.addedAt || Date.now(),
      formattedDuration: formatDuration(rawTrack.info.length),
    };
  }

  const info = rawTrack.info || {};
  return {
    encoded: rawTrack.encoded || rawTrack.track || "",
    info: {
      identifier: info.identifier || "",
      isSeekable: Boolean(info.isSeekable ?? true),
      author: info.author || "Unknown Artist",
      length: Number(info.length) || 0,
      isStream: Boolean(info.isStream),
      position: Number(info.position) || 0,
      title: info.title || "Unknown Title",
      uri: info.uri || "",
      artworkUrl: info.artworkUrl || rawTrack.thumbnail || null,
      sourceName: info.sourceName || "unknown",
    },
    requester: requester
      ? {
          id: requester.id,
          username: requester.username || requester.tag || "User",
          avatar: typeof requester.displayAvatarURL === "function"
            ? requester.displayAvatarURL({ dynamic: true })
            : requester.avatar || null,
        }
      : null,
    addedAt: Date.now(),
    formattedDuration: formatDuration(info.length),
  };
}

export interface ITrackQueueOptions {
  loopMode?: LoopModeType;
  autoplay?: boolean;
  maxSize?: number;
}

export class TrackQueue {
  public guildId: string;
  public tracks: IFormattedTrack[];
  public previousTracks: IFormattedTrack[];
  public current: IFormattedTrack | null;
  public loopMode: LoopModeType;
  public autoplay: boolean;
  public maxSize: number;
  public maxHistorySize: number;

  constructor(guildId: string, options: ITrackQueueOptions = {}) {
    this.guildId = String(guildId);
    this.tracks = [];
    this.previousTracks = [];
    this.current = null;
    this.loopMode = options.loopMode || LoopMode.OFF;
    this.autoplay = Boolean(options.autoplay);
    this.maxSize = Number(options.maxSize) || CONFIG.MUSIC_MAX_QUEUE_SIZE;
    this.maxHistorySize = 25;
  }

  get size(): number {
    return this.tracks.length;
  }

  get history(): IFormattedTrack[] {
    return this.previousTracks;
  }

  get totalDuration(): number {
    const currentDuration = this.current ? (this.current.info.length || 0) : 0;
    const queuedDuration = this.tracks.reduce((acc, t) => acc + (t.info.length || 0), 0);
    return currentDuration + queuedDuration;
  }

  get formattedTotalDuration(): string {
    return formatDuration(this.totalDuration);
  }

  get isEmpty(): boolean {
    return this.tracks.length === 0 && !this.current;
  }

  /**
   * Adds track to end of queue and returns position in queue
   */
  add(track: any, requester: any = null): number {
    if (this.tracks.length >= this.maxSize) return this.tracks.length;
    const formatted = formatTrack(track, requester);
    if (formatted && formatted.encoded) {
      this.tracks.push(formatted);
    }
    return this.tracks.length;
  }

  /**
   * Adds multiple tracks and returns count of tracks added
   */
  addMany(tracks: any[], requester: any = null): number {
    if (!Array.isArray(tracks)) return 0;
    let added = 0;
    for (const t of tracks) {
      if (this.tracks.length >= this.maxSize) break;
      const formatted = formatTrack(t, requester);
      if (formatted && formatted.encoded) {
        this.tracks.push(formatted);
        added++;
      }
    }
    return added;
  }

  /**
   * Inserts track(s) at a specific index in the queue
   */
  insert(index: number, trackOrTracks: any, requester: any = null): number {
    const items = Array.isArray(trackOrTracks) ? trackOrTracks : [trackOrTracks];
    const safeIdx = Math.max(0, Math.min(index, this.tracks.length));
    const formattedItems = items
      .map((i) => formatTrack(i, requester))
      .filter((i): i is IFormattedTrack => Boolean(i && i.encoded));

    const availableSlots = Math.max(0, this.maxSize - this.tracks.length);
    const toInsert = formattedItems.slice(0, availableSlots);
    this.tracks.splice(safeIdx, 0, ...toInsert);
    return toInsert.length;
  }

  /**
   * Advances queue: moves current track to history / loop, returns next track
   */
  next(currentTrackOverride: IFormattedTrack | null = null): IFormattedTrack | null {
    const cur = currentTrackOverride || this.current;

    if (cur) {
      // Handle Track Loop
      if (this.loopMode === LoopMode.TRACK) {
        return cur;
      }

      // Handle Queue Loop
      if (this.loopMode === LoopMode.QUEUE) {
        this.tracks.push(cur);
      }

      // Add to History
      this.recordHistory(cur);
    }

    this.current = this.tracks.shift() || null;
    return this.current;
  }

  poll(current: IFormattedTrack | null = null): IFormattedTrack | null {
    return this.next(current);
  }

  recordHistory(track: IFormattedTrack | null): void {
    if (!track) return;
    this.previousTracks.push(track);
    if (this.previousTracks.length > this.maxHistorySize) {
      this.previousTracks.shift();
    }
  }

  previous(): IFormattedTrack | null {
    if (this.previousTracks.length === 0) return null;

    const prevTrack = this.previousTracks.pop()!;
    if (this.current) {
      this.tracks.unshift(this.current);
    }
    this.current = prevTrack;
    return this.current;
  }

  remove(index: number): IFormattedTrack | null {
    const idx = Number(index);
    if (idx < 0 || idx >= this.tracks.length) return null;
    return this.tracks.splice(idx, 1)[0] || null;
  }

  move(fromIndex: number, toIndex: number): IFormattedTrack | null {
    const from = Number(fromIndex);
    const to = Number(toIndex);
    if (from < 0 || from >= this.tracks.length) return null;
    if (to < 0 || to >= this.tracks.length) return null;

    const [track] = this.tracks.splice(from, 1);
    this.tracks.splice(to, 0, track);
    return track;
  }

  shuffle(): void {
    if (this.tracks.length <= 1) return;
    for (let i = this.tracks.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.tracks[i], this.tracks[j]] = [this.tracks[j], this.tracks[i]];
    }
  }

  clear(): number {
    const count = this.tracks.length;
    this.tracks = [];
    return count;
  }

  reset(): void {
    this.tracks = [];
    this.previousTracks = [];
    this.current = null;
    this.loopMode = LoopMode.OFF;
  }

  setLoop(mode: string): boolean {
    const validModes = Object.values(LoopMode) as string[];
    if (validModes.includes(mode)) {
      this.loopMode = mode as LoopModeType;
      return true;
    }
    return false;
  }

  setLoopMode(mode: string): boolean {
    return this.setLoop(mode);
  }

  setAutoplay(enabled: boolean): void {
    this.autoplay = Boolean(enabled);
  }

  getPage(page: number = 1, pageSize: number = 10) {
    const totalPages = Math.max(1, Math.ceil(this.tracks.length / pageSize));
    const safePage = Math.max(1, Math.min(page, totalPages));
    const startIndex = (safePage - 1) * pageSize;
    const items = this.tracks.slice(startIndex, startIndex + pageSize);

    return {
      items,
      tracks: items,
      page: safePage,
      pageSize,
      totalPages,
      totalTracks: this.tracks.length,
      hasPrevious: safePage > 1,
      hasNext: safePage < totalPages,
    };
  }

  toJSON(): Record<string, any> {
    return {
      current: this.current,
      tracks: this.tracks,
      previousTracks: this.previousTracks.slice(-5),
      size: this.tracks.length,
      totalDuration: this.totalDuration,
      formattedTotalDuration: this.formattedTotalDuration,
      loopMode: this.loopMode,
      autoplay: this.autoplay,
    };
  }
}
