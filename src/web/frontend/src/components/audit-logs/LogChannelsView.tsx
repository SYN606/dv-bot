import React, { useState, useEffect } from "react";
import {
  Gavel,
  ShieldAlert,
  Terminal,
  Trash2,
  Edit3,
  Layers,
  UserPlus,
  UserMinus,
  ShieldCheck,
  Volume2,
  VolumeX,
  ArrowRightLeft,
  Sparkles,
  Flame,
  Settings,
  Hash,
  FolderMinus,
  Sliders,
  Send,
  Pipette,
  Check,
  RotateCcw,
  Save,
  HelpCircle,
  Radio,
} from "lucide-react";
import { ChannelSelector } from "../discord";
import Button from "../ui/Button";
import Switch from "../ui/Switch";

export interface LogEventMeta {
  id: string;
  name: string;
  category: "moderation" | "messages" | "members" | "voice" | "roles" | "channels";
  description: string;
  icon: any;
  defaultColor: string;
}

export const LOG_EVENT_GROUPS: {
  category: "moderation" | "messages" | "members" | "voice" | "roles" | "channels";
  title: string;
  description: string;
  events: LogEventMeta[];
}[] = [
  {
    category: "moderation",
    title: "Moderation",
    description: "Disciplinary actions, automated raid & spam filters, and administrative commands.",
    events: [
      {
        id: "moderation_action",
        name: "Moderation Action",
        category: "moderation",
        description: "Permanent bans, kicks, mutes, tempbans, and warning strikes.",
        icon: Gavel,
        defaultColor: "#EF4444",
      },
      {
        id: "auto_moderation",
        name: "Auto Moderation",
        category: "moderation",
        description: "Automod triggers, blocked invites, raid filters, and anti-spam.",
        icon: ShieldAlert,
        defaultColor: "#F59E0B",
      },
      {
        id: "moderation_command",
        name: "Moderation Command Used",
        category: "moderation",
        description: "Staff invocations of /ban, /timeout, /purge, /lock, /slowmode.",
        icon: Terminal,
        defaultColor: "#8B5CF6",
      },
    ],
  },
  {
    category: "messages",
    title: "Messages",
    description: "Deleted message tracking, before/after edit diffs, and bulk chat purges.",
    events: [
      {
        id: "message_deleted",
        name: "Message Deleted",
        category: "messages",
        description: "Single deleted messages with media attachments and author details.",
        icon: Trash2,
        defaultColor: "#EF4444",
      },
      {
        id: "message_edited",
        name: "Message Edited",
        category: "messages",
        description: "Updated messages with side-by-side before and after text diff.",
        icon: Edit3,
        defaultColor: "#06B6D4",
      },
      {
        id: "messages_bulk_deleted",
        name: "Messages Bulk Deleted",
        category: "messages",
        description: "Channel purges and mass deletion events with total count.",
        icon: Layers,
        defaultColor: "#EC4899",
      },
    ],
  },
  {
    category: "members",
    title: "Members",
    description: "Audience traffic tracking, account age verifications, and role assignment logs.",
    events: [
      {
        id: "member_joined",
        name: "Member Joined",
        category: "members",
        description: "New member arrivals, account age flags, and invite sources.",
        icon: UserPlus,
        defaultColor: "#10B981",
      },
      {
        id: "member_left",
        name: "Member Left",
        category: "members",
        description: "Member departures, time spent in server, and roles held.",
        icon: UserMinus,
        defaultColor: "#64748B",
      },
      {
        id: "member_roles_updated",
        name: "Member Roles Updated",
        category: "members",
        description: "Roles added or removed from members and responsible staff.",
        icon: ShieldCheck,
        defaultColor: "#6366F1",
      },
    ],
  },
  {
    category: "voice",
    title: "Voice",
    description: "Voice channel connection states, active talk time sessions, and staff drags.",
    events: [
      {
        id: "voice_joined",
        name: "Member Joined Voice Channel",
        category: "voice",
        description: "Members connecting to voice, stage, or video channels.",
        icon: Volume2,
        defaultColor: "#10B981",
      },
      {
        id: "voice_left",
        name: "Member Left Voice Channel",
        category: "voice",
        description: "Voice disconnections with total session duration elapsed.",
        icon: VolumeX,
        defaultColor: "#F43F5E",
      },
      {
        id: "voice_moved",
        name: "Member Moved Voice Channel",
        category: "voice",
        description: "Members switching or being dragged across voice channels.",
        icon: ArrowRightLeft,
        defaultColor: "#8B5CF6",
      },
    ],
  },
  {
    category: "roles",
    title: "Roles",
    description: "Role hierarchy changes, permission updates, and administrative role creation.",
    events: [
      {
        id: "role_created",
        name: "Role Created",
        category: "roles",
        description: "Newly created server roles with initial permissions and color.",
        icon: Sparkles,
        defaultColor: "#10B981",
      },
      {
        id: "role_deleted",
        name: "Role Deleted",
        category: "roles",
        description: "Deleted server roles and moderator responsible.",
        icon: Flame,
        defaultColor: "#EF4444",
      },
      {
        id: "role_updated",
        name: "Role Updated",
        category: "roles",
        description: "Role renames, color modifications, and permission overrides.",
        icon: Settings,
        defaultColor: "#3B82F6",
      },
    ],
  },
  {
    category: "channels",
    title: "Channels",
    description: "Channel lifecycle events, permission overrides, slowmode, and topic changes.",
    events: [
      {
        id: "channel_created",
        name: "Channel Created",
        category: "channels",
        description: "Creation of new text, voice, forum, or announcement channels.",
        icon: Hash,
        defaultColor: "#10B981",
      },
      {
        id: "channel_deleted",
        name: "Channel Deleted",
        category: "channels",
        description: "Deleted channels and moderator responsible.",
        icon: FolderMinus,
        defaultColor: "#EF4444",
      },
      {
        id: "channel_updated",
        name: "Channel Updated",
        category: "channels",
        description: "Renames, topic modifications, slowmode rate limits, and perms.",
        icon: Sliders,
        defaultColor: "#06B6D4",
      },
    ],
  },
];

const PRESET_COLORS = [
  "#EF4444", // Crimson
  "#F59E0B", // Amber
  "#10B981", // Emerald
  "#06B6D4", // Cyan
  "#6366F1", // Indigo
  "#8B5CF6", // Violet
  "#EC4899", // Pink
  "#64748B", // Slate
];

export default function LogChannelsView({
  guildId,
  channels = [],
  modLogConfig = { modLogChannelId: "", enabled: false, eventsConfig: {} },
  onSaveConfig,
  savingConfig = false,
  onSendTest,
  testingLog = false,
}) {
  const [defaultChannelId, setDefaultChannelId] = useState(modLogConfig.modLogChannelId || "");
  const [masterEnabled, setMasterEnabled] = useState(modLogConfig.enabled ?? true);
  const [eventsState, setEventsState] = useState<Record<string, any>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [activeColorPicker, setActiveColorPicker] = useState<string | null>(null);
  const [testingEventId, setTestingEventId] = useState<string | null>(null);

  // Sync state when incoming config loads
  useEffect(() => {
    setDefaultChannelId(modLogConfig.modLogChannelId || "");
    setMasterEnabled(modLogConfig.enabled ?? true);

    const initialEvents: Record<string, any> = {};
    const existing = modLogConfig.eventsConfig || {};

    LOG_EVENT_GROUPS.forEach((group) => {
      group.events.forEach((ev) => {
        initialEvents[ev.id] = {
          enabled: existing[ev.id]?.enabled !== undefined ? existing[ev.id].enabled : true,
          channel_id: existing[ev.id]?.channel_id || "",
          color: existing[ev.id]?.color || ev.defaultColor,
        };
      });
    });

    setEventsState(initialEvents);
    setHasChanges(false);
  }, [modLogConfig]);

  const handleToggleEvent = (eventId: string, enabled: boolean) => {
    setEventsState((prev) => ({
      ...prev,
      [eventId]: {
        ...(prev[eventId] || {}),
        enabled,
      },
    }));
    setHasChanges(true);
  };

  const handleChannelChange = (eventId: string, channelId: string) => {
    setEventsState((prev) => ({
      ...prev,
      [eventId]: {
        ...(prev[eventId] || {}),
        channel_id: channelId,
      },
    }));
    setHasChanges(true);
  };

  const handleColorChange = (eventId: string, color: string) => {
    setEventsState((prev) => ({
      ...prev,
      [eventId]: {
        ...(prev[eventId] || {}),
        color,
      },
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    await onSaveConfig(defaultChannelId, eventsState);
    setHasChanges(false);
  };

  const handleReset = () => {
    setDefaultChannelId(modLogConfig.modLogChannelId || "");
    setMasterEnabled(modLogConfig.enabled ?? true);
    const initialEvents: Record<string, any> = {};
    const existing = modLogConfig.eventsConfig || {};
    LOG_EVENT_GROUPS.forEach((group) => {
      group.events.forEach((ev) => {
        initialEvents[ev.id] = {
          enabled: existing[ev.id]?.enabled !== undefined ? existing[ev.id].enabled : true,
          channel_id: existing[ev.id]?.channel_id || "",
          color: existing[ev.id]?.color || ev.defaultColor,
        };
      });
    });
    setEventsState(initialEvents);
    setHasChanges(false);
  };

  const handleTestEvent = async (ev: LogEventMeta) => {
    const evConfig = eventsState[ev.id] || {};
    const targetChannel = evConfig.channel_id || defaultChannelId;
    setTestingEventId(ev.id);
    try {
      await onSendTest({
        eventType: ev.id,
        channelId: targetChannel,
        eventLabel: ev.name,
        color: evConfig.color || ev.defaultColor,
      });
    } finally {
      setTestingEventId(null);
    }
  };

  const defaultChannelObj = channels.find((c) => c.id === defaultChannelId);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* 1. Global Default Channel Banner */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 relative overflow-hidden bg-gradient-to-br from-slate-900/80 via-slate-950/80 to-slate-900/80 shadow-2xl">
        <div className="absolute top-0 right-0 p-8 text-8xl font-display text-white opacity-[0.02] pointer-events-none select-none">
          LOGS
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-white/[0.08] relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="w-2.5 h-2.5 rounded-full bg-brand-crimson animate-pulse" />
              <h2 className="text-xl sm:text-2xl font-heading font-extrabold text-white tracking-tight">
                Log Channels Architecture
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-brand-crimson/10 border border-brand-crimson/20 text-brand-crimson font-mono text-[11px] font-semibold">
                NOCTALY ARCHITECTURE
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
              Route specific Discord events to dedicated channels, customize embed accent colors, or let unassigned events automatically inherit your server default log channel.
            </p>
          </div>

          {/* Master Switch & Unsaved Bar */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-2.5 rounded-2xl">
              <span className="text-xs font-semibold text-slate-300">Master Logging:</span>
              <Switch
                checked={masterEnabled}
                onChange={(val) => {
                  setMasterEnabled(val);
                  setHasChanges(true);
                }}
              />
            </div>

            {hasChanges && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                  disabled={savingConfig}
                  className="text-xs"
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                  Reset
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSave}
                  isLoading={savingConfig}
                  loadingText="Saving..."
                  className="text-xs bg-brand-crimson hover:bg-brand-crimson-dark"
                >
                  <Save className="w-3.5 h-3.5 mr-1.5" />
                  Save Changes
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Global Default Channel Selector */}
        <div className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-6 items-center relative z-10">
          <div>
            <label className="block text-xs font-mono text-slate-300 uppercase tracking-widest font-bold mb-2">
              Default Fallback Log Channel
            </label>
            <ChannelSelector
              guildId={guildId}
              channels={channels}
              value={defaultChannelId}
              onChange={(val) => {
                setDefaultChannelId(val);
                setHasChanges(true);
              }}
              allowedTypes={[0, 5]}
              placeholder="Select default log channel (#mod-logs, #audit-logs)..."
              specialOptions={[
                { value: "", label: "None / Disabled", description: "Events must configure specific channels" },
              ]}
            />
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-between gap-4">
            <div>
              <div className="text-xs font-bold text-white mb-0.5">Test Global Log Dispatch</div>
              <div className="text-[11px] text-slate-400">
                {defaultChannelObj
                  ? `Delivers verification test embed to #${defaultChannelObj.name}`
                  : "Select a default channel above to send a test"}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSendTest({ channelId: defaultChannelId, eventLabel: "Default Mod Log" })}
              disabled={!defaultChannelId || testingLog}
              isLoading={testingLog && !testingEventId}
              loadingText="Sending..."
              className="text-xs shrink-0"
            >
              <Send className="w-3.5 h-3.5 mr-1.5" />
              Send Test
            </Button>
          </div>
        </div>
      </div>

      {/* 2. Categorized Event Groups Grid */}
      <div className="space-y-10">
        {LOG_EVENT_GROUPS.map((group) => (
          <div key={group.category} className="space-y-4">
            <div className="flex items-center justify-between gap-4 pb-2 border-b border-white/[0.06]">
              <div>
                <h3 className="text-base sm:text-lg font-heading font-extrabold text-white tracking-tight flex items-center gap-2">
                  <span>{group.title}</span>
                  <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-slate-400 font-normal">
                    {group.events.length} Events
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">{group.description}</p>
              </div>
            </div>

            {/* Event Cards Grid matching Noctaly architecture */}
            <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-5">
              {group.events.map((ev) => {
                const Icon = ev.icon;
                const state = eventsState[ev.id] || {
                  enabled: true,
                  channel_id: "",
                  color: ev.defaultColor,
                };
                const isConfigured = Boolean(state.channel_id);
                const isTestingThis = testingEventId === ev.id;
                const targetChannelObj = channels.find((c) => c.id === (state.channel_id || defaultChannelId));

                return (
                  <div
                    key={ev.id}
                    className={`glass-card p-5 rounded-3xl border transition-all duration-300 flex flex-col justify-between gap-4 relative overflow-hidden ${
                      state.enabled
                        ? "border-white/10 hover:border-white/20 bg-linear-to-b from-slate-900/90 to-slate-950/90 shadow-xl"
                        : "border-white/5 opacity-60 bg-slate-950/50"
                    }`}
                  >
                    {/* Top Row: Icon + Title + Switch */}
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border"
                            style={{
                              backgroundColor: `${state.color}15`,
                              borderColor: `${state.color}35`,
                              color: state.color,
                            }}
                          >
                            <Icon className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-white tracking-tight leading-snug">
                              {ev.name}
                            </h4>
                            <div className="text-[11px] text-slate-400 line-clamp-1">
                              {ev.description}
                            </div>
                          </div>
                        </div>

                        {/* Event Enable Switch */}
                        <div className="pt-1 shrink-0">
                          <Switch
                            checked={state.enabled}
                            onChange={(val) => handleToggleEvent(ev.id, val)}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Bottom Controls: Color Pipette + Channel Dropdown + Send Test */}
                    <div className="pt-3 border-t border-white/5 space-y-3">
                      <div className="flex items-center gap-2">
                        {/* Pipette Color Picker Swatch */}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() =>
                              setActiveColorPicker(activeColorPicker === ev.id ? null : ev.id)
                            }
                            className="w-9 h-9 rounded-xl border border-white/10 flex items-center justify-center shadow-inner cursor-pointer hover:scale-105 transition-transform"
                            style={{ backgroundColor: state.color }}
                            title="Customize embed accent color"
                          >
                            <Pipette className="w-3.5 h-3.5 text-white drop-shadow-md" />
                          </button>

                          {/* Color Popover Palette */}
                          {activeColorPicker === ev.id && (
                            <>
                              <div
                                className="fixed inset-0 z-40"
                                onClick={() => setActiveColorPicker(null)}
                              />
                              <div className="absolute left-0 bottom-11 z-50 p-3 rounded-2xl glass-panel border border-white/10 shadow-2xl bg-slate-950/95 w-52 space-y-2.5 animate-in fade-in zoom-in-95 duration-150">
                                <div className="text-[10px] font-mono text-slate-400 uppercase tracking-widest font-bold">
                                  Preset Colors
                                </div>
                                <div className="grid grid-cols-4 gap-2">
                                  {PRESET_COLORS.map((hex) => (
                                    <button
                                      key={hex}
                                      type="button"
                                      onClick={() => {
                                        handleColorChange(ev.id, hex);
                                        setActiveColorPicker(null);
                                      }}
                                      className="w-9 h-9 rounded-xl border border-white/10 flex items-center justify-center transition-transform hover:scale-110 cursor-pointer"
                                      style={{ backgroundColor: hex }}
                                    >
                                      {state.color.toUpperCase() === hex.toUpperCase() && (
                                        <Check className="w-4 h-4 text-white drop-shadow-md" />
                                      )}
                                    </button>
                                  ))}
                                </div>
                                <div className="pt-1">
                                  <input
                                    type="text"
                                    value={state.color}
                                    onChange={(e) => handleColorChange(ev.id, e.target.value)}
                                    className="w-full px-2.5 py-1 text-xs font-mono bg-slate-900 border border-white/10 rounded-lg text-white focus:outline-none focus:border-brand-crimson/50"
                                    placeholder="#RRGGBB"
                                  />
                                </div>
                              </div>
                            </>
                          )}
                        </div>

                        {/* Channel Selector for this Event */}
                        <div className="flex-1">
                          <ChannelSelector
                            guildId={guildId}
                            channels={channels}
                            value={state.channel_id}
                            onChange={(val) => handleChannelChange(ev.id, val)}
                            allowedTypes={[0, 5]}
                            placeholder={
                              defaultChannelObj
                                ? `Inherit default (#${defaultChannelObj.name})`
                                : "Select destination channel..."
                            }
                            specialOptions={[
                              {
                                value: "",
                                label: defaultChannelObj
                                  ? `Inherit Default (#${defaultChannelObj.name})`
                                  : "Use Default Channel",
                                description: "Fall back to global default log channel",
                              },
                            ]}
                          />
                        </div>
                      </div>

                      {/* Card Footer Info & Dispatch Test */}
                      <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 pt-1">
                        <span className="flex items-center gap-1.5 truncate max-w-[65%]">
                          <span
                            className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ backgroundColor: state.color }}
                          />
                          <span className="truncate">
                            {targetChannelObj
                              ? `#${targetChannelObj.name}`
                              : "No channel assigned"}
                          </span>
                        </span>

                        <button
                          type="button"
                          onClick={() => handleTestEvent(ev)}
                          disabled={!targetChannelObj || testingLog}
                          className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-white transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                          title="Dispatch test embed to this channel"
                        >
                          <Send className={`w-3 h-3 ${isTestingThis ? "animate-spin text-brand-crimson" : ""}`} />
                          <span>{isTestingThis ? "Sending..." : "Test"}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Floating Unsaved Changes Bar at bottom */}
      {hasChanges && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-xl px-4 animate-in slide-in-from-bottom-5 duration-200">
          <div className="glass-panel p-4 rounded-2xl border border-white/15 bg-slate-950/95 shadow-2xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-xs font-semibold text-white">
                Unsaved log channel routing modifications
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                disabled={savingConfig}
                className="text-xs"
              >
                Discard
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSave}
                isLoading={savingConfig}
                loadingText="Saving..."
                className="text-xs bg-brand-crimson hover:bg-brand-crimson-dark"
              >
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
