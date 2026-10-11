import { describe, it, expect, beforeEach } from "bun:test";
import { TrackQueue, formatTrack } from "../src/music/TrackQueue.js";
import { FILTER_PRESETS, buildFilterPayload } from "../src/music/AudioFilters.js";
import { MusicPermissionService } from "../src/music/MusicPermissionService.js";
import {
  getMusicSettings,
  updateMusicSettings,
  createPlaylist,
  getPlaylist,
  getUserPlaylists,
  addTrackToPlaylist,
  removeTrackFromPlaylist,
  deletePlaylist,
  recordMusicHistory,
  getGuildMusicHistory,
} from "../src/db/helpers/music.js";
import { initDb } from "../src/db/index.js";

function mockTrack(id, title = "Test Song", length = 180000) {
  return {
    track: `encoded_${id}`,
    info: {
      identifier: id,
      isSeekable: true,
      author: "Test Artist",
      length,
      isStream: false,
      position: 0,
      title,
      uri: `https://youtube.com/watch?v=${id}`,
      artworkUrl: "https://example.com/art.jpg",
      sourceName: "youtube",
    },
    requester: { id: "123456789", username: "MusicLover" },
    addedAt: Date.now(),
    formattedDuration: "3:00",
  };
}

describe("Music Subsystem - TrackQueue", () => {
  let queue;

  beforeEach(() => {
    queue = new TrackQueue("guild-test-1");
  });

  it("should initialize empty with default settings", () => {
    expect(queue.size).toBe(0);
    expect(queue.loopMode).toBe("off");
    expect(queue.autoplay).toBe(false);
    expect(queue.tracks.length).toBe(0);
    expect(queue.totalDuration).toBe(0);
  });

  it("should add tracks FIFO and compute duration accurately", () => {
    const t1 = mockTrack("1", "Song 1", 120000);
    const t2 = mockTrack("2", "Song 2", 180000);

    const pos1 = queue.add(t1);
    const pos2 = queue.add(t2);

    expect(pos1).toBe(1);
    expect(pos2).toBe(2);
    expect(queue.size).toBe(2);
    expect(queue.totalDuration).toBe(300000);
    expect(queue.formattedTotalDuration).toBe("5:00");
  });

  it("should poll next track correctly in off loop mode", () => {
    const t1 = mockTrack("1");
    const t2 = mockTrack("2");
    queue.add(t1);
    queue.add(t2);

    const polled = queue.poll(null);
    expect(polled.info.identifier).toBe("1");
    expect(queue.size).toBe(1);
  });

  it("should repeat current track when loopMode is track", () => {
    const current = mockTrack("current");
    const nextInQueue = mockTrack("next");
    queue.add(nextInQueue);
    queue.setLoopMode("track");

    const polled = queue.poll(current);
    expect(polled.info.identifier).toBe("current");
    expect(queue.size).toBe(1);
  });

  it("should cycle queue when loopMode is queue", () => {
    const current = mockTrack("current");
    const nextInQueue = mockTrack("next");
    queue.add(nextInQueue);
    queue.setLoopMode("queue");

    const polled = queue.poll(current);
    expect(polled.info.identifier).toBe("next");
    expect(queue.tracks[queue.tracks.length - 1].info.identifier).toBe("current");
  });

  it("should record history and navigate backwards with previous()", () => {
    const t1 = mockTrack("1");
    const t2 = mockTrack("2");

    queue.recordHistory(t1);
    queue.recordHistory(t2);

    expect(queue.history.length).toBe(2);

    const prev = queue.previous();
    expect(prev.info.identifier).toBe("2");
  });

  it("should shuffle, move, and remove tracks correctly", () => {
    const t1 = mockTrack("1");
    const t2 = mockTrack("2");
    const t3 = mockTrack("3");
    queue.add(t1);
    queue.add(t2);
    queue.add(t3);

    const moved = queue.move(0, 2);
    expect(moved.info.identifier).toBe("1");
    expect(queue.tracks[2].info.identifier).toBe("1");

    const removed = queue.remove(1);
    expect(removed).toBeDefined();
    expect(queue.size).toBe(2);

    queue.clear();
    expect(queue.size).toBe(0);
  });

  it("should paginate tracks accurately", () => {
    for (let i = 1; i <= 25; i++) {
      queue.add(mockTrack(String(i)));
    }

    const page1 = queue.getPage(1, 10);
    expect(page1.page).toBe(1);
    expect(page1.totalPages).toBe(3);
    expect(page1.tracks.length).toBe(10);
    expect(page1.tracks[0].info.identifier).toBe("1");

    const page3 = queue.getPage(3, 10);
    expect(page3.page).toBe(3);
    expect(page3.tracks.length).toBe(5);
  });
});

describe("Music Subsystem - AudioFilters", () => {
  it("should build flat payload for clear preset", () => {
    const payload = buildFilterPayload("clear");
    expect(payload.equalizer).toBeDefined();
    expect(payload.timescale).toBeNull();
    expect(payload.karaoke).toBeNull();
  });

  it("should build bass boost with low-end gain", () => {
    const payload = buildFilterPayload("bassboost_medium");
    expect(payload.equalizer).toBeDefined();
    expect(payload.equalizer[0].gain).toBe(0.25);
    expect(payload.equalizer[1].gain).toBe(0.2);
  });

  it("should build nightcore with speed and pitch scale", () => {
    const payload = buildFilterPayload("nightcore");
    expect(payload.timescale).toBeDefined();
    expect(payload.timescale.speed).toBe(1.25);
    expect(payload.timescale.pitch).toBe(1.25);
  });

  it("should build vaporwave with slowed speed and pitch", () => {
    const payload = buildFilterPayload("vaporwave");
    expect(payload.timescale).toBeDefined();
    expect(payload.timescale.speed).toBe(0.85);
    expect(payload.timescale.pitch).toBe(0.8);
  });

  it("should build rotation payload for 8d preset", () => {
    const payload = buildFilterPayload("8d");
    expect(payload.rotation).toBeDefined();
    expect(payload.rotation.rotationHz).toBe(0.2);
  });
});

describe("Music Subsystem - Database & Playlists", () => {
  beforeEach(async () => {
    await initDb();
  });

  it("should create, read, and update guild music settings", async () => {
    const guildId = `test-guild-${Date.now()}`;
    const initial = await getMusicSettings(guildId);

    expect(initial.guild_id).toBe(guildId);
    expect(initial.enabled).toBe(true);
    expect(initial.default_volume).toBe(80);

    const updated = await updateMusicSettings(guildId, {
      default_volume: 100,
      mode_247: true,
      dj_only: true,
    });

    expect(updated.default_volume).toBe(100);
    expect(updated.mode_247).toBe(true);
    expect(updated.dj_only).toBe(true);
  });

  it("should manage playlists and tracks end-to-end", async () => {
    const userId = "user-test-123";
    const guildId = "guild-test-456";

    const playlist = await createPlaylist({
      userId,
      guildId,
      name: "Rock Classics",
      description: "My favorite rock tracks",
      isPrivate: false,
      tracks: [
        {
          title: "Stairway to Heaven",
          author: "Led Zeppelin",
          uri: "https://youtube.com/watch?v=stairway",
          identifier: "stairway",
          sourceName: "youtube",
          length: 480000,
        },
      ],
    });

    expect(playlist.name).toBe("Rock Classics");
    expect(playlist.track_count).toBe(1);

    const userPlaylists = await getUserPlaylists(userId);
    expect(userPlaylists.length).toBeGreaterThan(0);

    // Add track
    await addTrackToPlaylist(playlist.id, userId, {
      title: "Bohemian Rhapsody",
      author: "Queen",
      uri: "https://youtube.com/watch?v=queen",
      identifier: "queen",
      sourceName: "youtube",
      length: 354000,
    });

    const refreshed = await getPlaylist(playlist.id, userId);
    expect(refreshed.track_count).toBe(2);

    // Remove track
    const removedOk = await removeTrackFromPlaylist(playlist.id, userId, 0);
    expect(removedOk).toBe(true);

    const afterRemove = await getPlaylist(playlist.id, userId);
    expect(afterRemove.track_count).toBe(1);

    // Delete playlist
    const deletedOk = await deletePlaylist(playlist.id, userId);
    expect(deletedOk).toBe(true);
  });

  it("should record and retrieve guild playback history", async () => {
    const guildId = `hist-guild-${Date.now()}`;
    await recordMusicHistory({
      guildId,
      userId: "user-1",
      title: "Hotel California",
      author: "Eagles",
      uri: "https://youtube.com/watch?v=hotel",
      duration: 390000,
    });

    const history = await getGuildMusicHistory(guildId, 10);
    expect(history.length).toBe(1);
    expect(history[0].title).toBe("Hotel California");
    expect(history[0].author).toBe("Eagles");
  });
});
