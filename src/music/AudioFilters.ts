/**
 * Audio Filters for Lavalink v4
 * Constructs filter payloads conforming to the Lavalink REST / WebSocket protocol.
 */

export interface IEqualizerBand {
  band: number;
  gain: number;
}

export interface ITimescale {
  speed?: number;
  pitch?: number;
  rate?: number;
}

export interface IKaraoke {
  level?: number;
  monoLevel?: number;
  filterBand?: number;
  filterWidth?: number;
}

export interface ITremolo {
  frequency?: number;
  depth?: number;
}

export interface IVibrato {
  frequency?: number;
  depth?: number;
}

export interface IRotation {
  rotationHz?: number;
}

export interface ILowPass {
  smoothing?: number;
}

export interface IFilterConfig {
  volume?: number;
  equalizer?: IEqualizerBand[];
  karaoke?: IKaraoke | null;
  timescale?: ITimescale | null;
  tremolo?: ITremolo | null;
  vibrato?: IVibrato | null;
  rotation?: IRotation | null;
  distortion?: any | null;
  channelMix?: any | null;
  lowPass?: ILowPass | null;
  [key: string]: any;
}

export interface IFilterPreset {
  name: string;
  description: string;
  filters: IFilterConfig;
}

export const FILTER_PRESETS: Record<string, IFilterPreset> = {
  clear: {
    name: "Clear",
    description: "Reset all audio filters to normal",
    filters: {},
  },
  lofi: {
    name: "Lo-Fi Chill",
    description: "Vintage cassette warmth, gentle tape flutter, and warm low-pass EQ",
    filters: {
      equalizer: [
        { band: 0, gain: 0.22 },
        { band: 1, gain: 0.18 },
        { band: 2, gain: 0.1 },
        { band: 3, gain: 0.05 },
        { band: 4, gain: 0.0 },
        { band: 5, gain: -0.05 },
        { band: 6, gain: -0.15 },
        { band: 7, gain: -0.25 },
        { band: 8, gain: -0.32 },
      ],
      timescale: {
        speed: 0.95,
        pitch: 0.96,
        rate: 1.0,
      },
      vibrato: {
        frequency: 2.2,
        depth: 0.16,
      },
      lowPass: {
        smoothing: 12.0,
      },
    },
  },
  bassboost_low: {
    name: "Bass Boost (Low)",
    description: "Mild bass enhancement",
    filters: {
      equalizer: [
        { band: 0, gain: 0.15 },
        { band: 1, gain: 0.12 },
        { band: 2, gain: 0.08 },
        { band: 3, gain: 0.04 },
      ],
    },
  },
  bassboost: {
    name: "Bass Boost (Medium)",
    description: "Thumping bass boost",
    filters: {
      equalizer: [
        { band: 0, gain: 0.25 },
        { band: 1, gain: 0.2 },
        { band: 2, gain: 0.15 },
        { band: 3, gain: 0.08 },
        { band: 4, gain: 0.03 },
      ],
    },
  },
  bassboost_high: {
    name: "Bass Boost (High)",
    description: "Heavy club bass boost",
    filters: {
      equalizer: [
        { band: 0, gain: 0.35 },
        { band: 1, gain: 0.3 },
        { band: 2, gain: 0.25 },
        { band: 3, gain: 0.15 },
        { band: 4, gain: 0.08 },
      ],
    },
  },
  nightcore: {
    name: "Nightcore",
    description: "High pitch and accelerated tempo",
    filters: {
      timescale: {
        speed: 1.25,
        pitch: 1.25,
        rate: 1.0,
      },
    },
  },
  vaporwave: {
    name: "Vaporwave",
    description: "Slowed tempo with relaxed lower pitch",
    filters: {
      timescale: {
        speed: 0.85,
        pitch: 0.8,
        rate: 1.0,
      },
    },
  },
  karaoke: {
    name: "Karaoke",
    description: "Reduces vocal frequencies",
    filters: {
      karaoke: {
        level: 1.0,
        monoLevel: 1.0,
        filterBand: 220.0,
        filterWidth: 100.0,
      },
    },
  },
  tremolo: {
    name: "Tremolo",
    description: "Rhythmic volume oscillation",
    filters: {
      tremolo: {
        frequency: 4.0,
        depth: 0.6,
      },
    },
  },
  vibrato: {
    name: "Vibrato",
    description: "Subtle pitch modulation",
    filters: {
      vibrato: {
        frequency: 5.0,
        depth: 0.5,
      },
    },
  },
  rotation: {
    name: "8D Audio / Rotation",
    description: "Rotating 360-degree stereo panning",
    filters: {
      rotation: {
        rotationHz: 0.2,
      },
    },
  },
  lowpass: {
    name: "Low Pass / Muffled",
    description: "Dampens high frequencies (underwater/party next door)",
    filters: {
      lowPass: {
        smoothing: 20.0,
      },
    },
  },
  pop: {
    name: "Pop EQ",
    description: "Balanced vocals and crisp treble",
    filters: {
      equalizer: [
        { band: 0, gain: -0.05 },
        { band: 1, gain: 0.05 },
        { band: 2, gain: 0.1 },
        { band: 3, gain: 0.15 },
        { band: 4, gain: 0.1 },
        { band: 5, gain: 0.0 },
        { band: 6, gain: -0.05 },
        { band: 7, gain: -0.05 },
        { band: 8, gain: 0.05 },
        { band: 9, gain: 0.1 },
      ],
    },
  },
  rock: {
    name: "Rock EQ",
    description: "Enhanced low-end and high-end clarity",
    filters: {
      equalizer: [
        { band: 0, gain: 0.2 },
        { band: 1, gain: 0.15 },
        { band: 2, gain: -0.05 },
        { band: 3, gain: -0.1 },
        { band: 4, gain: -0.05 },
        { band: 5, gain: 0.05 },
        { band: 6, gain: 0.15 },
        { band: 7, gain: 0.2 },
      ],
    },
  },
  electronic: {
    name: "Electronic EQ",
    description: "Deep bass and sharp high-ends",
    filters: {
      equalizer: [
        { band: 0, gain: 0.25 },
        { band: 1, gain: 0.2 },
        { band: 2, gain: 0.0 },
        { band: 3, gain: -0.05 },
        { band: 4, gain: 0.05 },
        { band: 5, gain: 0.15 },
        { band: 6, gain: 0.2 },
        { band: 7, gain: 0.25 },
      ],
    },
  },
};

// Aliases for seamless naming
FILTER_PRESETS.bassboost_medium = FILTER_PRESETS.bassboost;
FILTER_PRESETS["8d"] = FILTER_PRESETS.rotation;
FILTER_PRESETS["lo-fi"] = FILTER_PRESETS.lofi;
FILTER_PRESETS.chill = FILTER_PRESETS.lofi;

/**
 * Builds a clean filter payload for Shoukaku Player.setFilters()
 */
export function buildFilterPayload(presetKey?: string, customOverrides: Record<string, any> = {}): IFilterConfig {
  const normalizedKey = String(presetKey || "clear").toLowerCase().trim();
  const preset = FILTER_PRESETS[normalizedKey] || FILTER_PRESETS.clear;

  if (normalizedKey === "clear") {
    return {
      volume: 1.0,
      equalizer: [],
      karaoke: null,
      timescale: null,
      tremolo: null,
      vibrato: null,
      rotation: null,
      distortion: null,
      channelMix: null,
      lowPass: null,
      ...customOverrides,
    };
  }

  return {
    ...preset.filters,
    ...customOverrides,
  };
}
