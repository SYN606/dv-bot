import React, { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import {
  Ticket as TicketIcon,
  Plus,
  Trash2,
  Send,
  Check,
  Shield,
  Layers,
  Hash,
  FileText,
  Clock,
  UserCheck,
  ExternalLink,
  HelpCircle,
  AlertTriangle,
  Sparkles,
  MessageSquare,
  Tag,
  Save,
  ChevronDown,
  Bell,
  Pin,
  Users,
  Search,
  Eye,
  X,
  RefreshCw,
  Star,
  Activity,
  Award,
  TrendingUp,
  Smile,
  Paperclip,
  Gift,
  Maximize2,
  Minimize2,
  Folder,
} from "lucide-react";
import { useTickets, DEFAULT_PANEL } from "../../hooks/tickets/useTickets";
import { PageHeader, PageSkeleton, PageError, Switch, Tabs, ConfirmDialog } from "../../components/ui";
import { ChannelSelector, RoleSelector, EmojiSelector, EmojiBadge } from "../../components/discord";

const PRESET_COLORS = [
  { name: "Indigo", hex: "#6366F1" },
  { name: "Blurple", hex: "#5865F2" },
  { name: "Emerald", hex: "#10B981" },
  { name: "Sky", hex: "#0EA5E9" },
  { name: "Amber", hex: "#F59E0B" },
  { name: "Rose", hex: "#F43F5E" },
  { name: "Purple", hex: "#8B5CF6" },
  { name: "Dark", hex: "#2B2D31" },
];

export default function TicketsPage({ showToast }) {
  const { guildId } = useParams();
  const [activeTab, setActiveTab] = useState("panels");
  const [ticketFilter, setTicketFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPanelIndex, setSelectedPanelIndex] = useState(0);

  const {
    config,
    panels,
    ticketsData,
    analytics,
    channels,
    categoryChannels,
    roles,
    loading,
    savingConfig,
    savingPanel,
    deployingPanelId,
    hasConfigChanges,
    error,
    updateConfigField,
    saveConfig,
    savePanel,
    removePanel,
    deploy,
    fetchTickets,
    fetchNotes,
    addNote,
    deleteNote,
    fetchEvents,
    transitionTicket,
    refresh,
  } = useTickets(guildId, showToast);

  // Local draft state for selected panel
  const [panelDraft, setPanelDraft] = useState<any>(null);
  const [previewMode, setPreviewMode] = useState<"panel" | "channel">("panel");
  const [previewSelectOpen, setPreviewSelectOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [modalTab, setModalTab] = useState<"dossier" | "notes" | "events">("dossier");
  const [ticketNotesList, setTicketNotesList] = useState<any[]>([]);
  const [ticketEventsList, setTicketEventsList] = useState<any[]>([]);
  const [newNoteContent, setNewNoteContent] = useState("");
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);
  const [isRefreshingMeta, setIsRefreshingMeta] = useState(false);
  const [isWideSimulator, setIsWideSimulator] = useState(false);
  const [panelToDelete, setPanelToDelete] = useState<any>(null);
  const [isDeletingPanel, setIsDeletingPanel] = useState(false);

  const destinationChannel = useMemo(() => {
    return channels.find((c: any) => c.id === panelDraft?.channel_id);
  }, [channels, panelDraft?.channel_id]);

  const channelDisplayName = destinationChannel ? destinationChannel.name : "tickets";
  const activePanelFromDb = panels[selectedPanelIndex] || null;

  useEffect(() => {
    if (activePanelFromDb) {
      setPanelDraft(JSON.parse(JSON.stringify(activePanelFromDb)));
    } else if (panels.length === 0) {
      setPanelDraft(null);
    }
  }, [selectedPanelIndex, panels]);

  // Load notes and events when a ticket is opened in modal (with cancellation guard)
  useEffect(() => {
    let isCancelled = false;
    if (selectedTicket?.id) {
      fetchNotes(selectedTicket.id).then((notes) => {
        if (!isCancelled) setTicketNotesList(notes || []);
      });
      fetchEvents(selectedTicket.id).then((evts) => {
        if (!isCancelled) setTicketEventsList(evts || []);
      });
      setModalTab("dossier");
      setNewNoteContent("");
    } else {
      setTicketNotesList([]);
      setTicketEventsList([]);
    }
    return () => {
      isCancelled = true;
    };
  }, [selectedTicket?.id, fetchNotes, fetchEvents]);

  const isPanelDirty = useMemo(() => {
    if (!panelDraft || !activePanelFromDb) return false;
    return JSON.stringify(panelDraft) !== JSON.stringify(activePanelFromDb);
  }, [panelDraft, activePanelFromDb]);

  const [counterInputVal, setCounterInputVal] = useState<string>("");

  useEffect(() => {
    setCounterInputVal(String((Number(config.ticket_counter) || 0) + 1));
  }, [config.ticket_counter]);

  const channelPreview = useMemo(() => {
    const rawPattern = config.channel_name_pattern !== undefined ? config.channel_name_pattern : "ticket-{number}";
    const pattern = rawPattern.trim() || "ticket-{number}";
    const nextNum = (Number(config.ticket_counter) || 0) + 1;
    const numPadded = String(nextNum).padStart(4, "0");
    const numRaw = String(nextNum);
    const cleanUsername = "alex";
    const cleanCategory = "support";

    let name = pattern
      .replace(/\{number\}|\{num\}/gi, numPadded)
      .replace(/\{raw_number\}|\{count\}/gi, numRaw)
      .replace(/\{username\}|\{user\}/gi, cleanUsername)
      .replace(/\{display_name\}|\{name\}/gi, cleanUsername)
      .replace(/\{category\}|\{dept\}/gi, cleanCategory);

    name = name.toLowerCase().replace(/\s+/g, "-");
    name = name.replace(/[^\p{L}\p{N}\p{Extended_Pictographic}_・│|~-]/gu, "");
    name = name.replace(/-+/g, "-");
    name = name.replace(/^-+|-+$/g, "");
    name = name.slice(0, 40);

    return name || `ticket-${numPadded}`;
  }, [config.channel_name_pattern, config.ticket_counter]);

  if (loading) {
    return <PageSkeleton cards={3} rows={0} />;
  }

  if (error) {
    return <PageError title="Failed to load ticket system" description={error} onRetry={refresh} />;
  }

  const handleAddNewPanel = () => {
    const newId = `pnl_${Date.now()}`;
    const newPanel = {
      ...DEFAULT_PANEL,
      id: newId,
      guild_id: guildId,
      title: `🎫 Support Panel ${panels.length + 1}`,
      enable_reason_categories: false,
      reason_categories: [],
    };
    savePanel(newPanel).then(() => {
      setSelectedPanelIndex(panels.length);
    });
  };

  const handleSaveCurrentPanel = () => {
    if (!panelDraft) return;
    savePanel(panelDraft);
  };

  const handleDeleteCurrentPanel = () => {
    if (!panelDraft) return;
    setPanelToDelete(panelDraft);
  };

  const handleConfirmDeletePanel = async () => {
    if (!panelToDelete) return;
    setIsDeletingPanel(true);
    try {
      await removePanel(panelToDelete.id);
      setSelectedPanelIndex((prev) => Math.max(0, Math.min(prev, panels.length - 2)));
      setPanelToDelete(null);
    } finally {
      setIsDeletingPanel(false);
    }
  };

  const handleUpdateDraft = (field: string, val: any) => {
    setPanelDraft((prev: any) => ({
      ...prev,
      [field]: val,
    }));
  };

  const handleAddReasonCategory = () => {
    if (!panelDraft) return;
    const existing = panelDraft.reason_categories || [];
    const newCat = {
      id: `cat_${Date.now()}`,
      label: "",
      emoji: "📩",
      description: "",
      require_reason: false,
      category_id: "",
    };
    handleUpdateDraft("reason_categories", [...existing, newCat]);
  };

  const handleUpdateReasonCategory = (catId: string, field: string, val: any) => {
    if (!panelDraft) return;
    const existing = panelDraft.reason_categories || [];
    const updated = existing.map((c: any) => (c.id === catId ? { ...c, [field]: val } : c));
    handleUpdateDraft("reason_categories", updated);
  };

  const handleRemoveReasonCategory = (catId: string) => {
    if (!panelDraft) return;
    const existing = panelDraft.reason_categories || [];
    handleUpdateDraft(
      "reason_categories",
      existing.filter((c: any) => c.id !== catId)
    );
  };

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket?.id || !newNoteContent.trim() || isSubmittingNote) return;
    setIsSubmittingNote(true);
    try {
      const note = await addNote(selectedTicket.id, newNoteContent.trim());
      if (note) {
        setTicketNotesList((prev) => [note, ...prev]);
        setNewNoteContent("");
      }
    } finally {
      setIsSubmittingNote(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!selectedTicket?.id) return;
    await deleteNote(selectedTicket.id, noteId);
    setTicketNotesList((prev) => prev.filter((n) => n.id !== noteId));
  };

  const handleStateTransition = async (nextStatus: string, reason?: string) => {
    if (!selectedTicket?.id) return;
    const success = await transitionTicket(selectedTicket.id, nextStatus, reason);
    if (success) {
      setSelectedTicket((prev: any) => ({ ...prev, status: nextStatus }));
      fetchEvents(selectedTicket.id).then((evts) => setTicketEventsList(evts || []));
    }
  };

  const handleRefreshServerMeta = async () => {
    setIsRefreshingMeta(true);
    try {
      await refresh(true);
      showToast?.("Channels & categories refreshed from Discord!", "success");
    } finally {
      setIsRefreshingMeta(false);
    }
  };

  // Filtered tickets list for browser
  const filteredTickets = (ticketsData?.tickets || []).filter((t: any) => {
    const matchesFilter = ticketFilter === "all" || t.status === ticketFilter;
    const q = searchQuery.toLowerCase().trim();
    if (!q) return matchesFilter;
    const matchesQuery =
      String(t.ticket_number).includes(q) ||
      (t.user_tag || "").toLowerCase().includes(q) ||
      (t.category_name || "").toLowerCase().includes(q) ||
      (t.reason || "").toLowerCase().includes(q);
    return matchesFilter && matchesQuery;
  });

  const tabs = [
    { id: "panels", label: "Ticket Panels", icon: Layers },
    { id: "browser", label: `Active Tickets (${ticketsData.total})`, icon: TicketIcon },
    { id: "settings", label: "Settings & Naming", icon: Shield },
    { id: "analytics", label: "Analytics & SLA", icon: TrendingUp },
  ];

  return (
    <div className="space-y-6 w-full max-w-[1600px] mx-auto pb-16 px-3 sm:px-6 lg:px-8">
      {/* Header */}
      <PageHeader
        category="COMMUNITY & SUPPORT"
        title="Support Management Platform"
        description="Enterprise-grade Discord ticket tooling with multi-department routing, private staff notes, SLA monitoring, and live transcripts."
        hasModuleSwitch={true}
        enabled={config.enabled}
        onToggle={(val) => {
          updateConfigField("enabled", val);
          saveConfig({ enabled: val });
        }}
        switchLabel="Ticket System"
        actions={
          activeTab === "panels" ? (
            <button
              type="button"
              onClick={handleSaveCurrentPanel}
              disabled={savingPanel || !panelDraft}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                isPanelDirty
                  ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/30 ring-2 ring-emerald-400/50"
                  : "bg-white/10 hover:bg-white/15 text-slate-300 hover:text-white"
              }`}
            >
              <Save className="w-4 h-4" />
              <span>{savingPanel ? "Saving..." : isPanelDirty ? "Save Panel *" : "Save Panel"}</span>
            </button>
          ) : activeTab === "settings" ? (
            <button
              type="button"
              onClick={() => saveConfig()}
              disabled={savingConfig}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                hasConfigChanges
                  ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 ring-2 ring-indigo-400/50"
                  : "bg-white/10 hover:bg-white/15 text-slate-300 hover:text-white"
              }`}
            >
              <Check className="w-4 h-4" />
              <span>{savingConfig ? "Saving..." : hasConfigChanges ? "Save Settings *" : "Save Settings"}</span>
            </button>
          ) : null
        }
      />

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* TAB 1: PANELS & DEPARTMENTS (WIDER DISCORD SIMULATOR) */}
      {activeTab === "panels" && (
        <div className="space-y-6">
          {/* Redesigned Panel Selector & Action Header */}
          <div className="flex items-center justify-between flex-wrap gap-3 p-3.5 rounded-2xl bg-slate-900/60 border border-white/5 shadow-sm">
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1">
              {panels.length === 0 ? (
                <span className="text-xs text-slate-500 italic px-2">No active ticket panels</span>
              ) : (
                panels.map((p, idx) => {
                const isSelected = selectedPanelIndex === idx;
                const destChannel = channels.find((c: any) => c.id === p.channel_id);
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPanelIndex(idx)}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                      isSelected
                        ? "bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30"
                        : "bg-slate-950/40 text-slate-300 hover:text-white hover:bg-slate-800/60 border-white/5"
                    }`}
                  >
                    <span>{p.title || `Panel #${idx + 1}`}</span>
                    {destChannel && (
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                          isSelected ? "bg-indigo-700/60 text-indigo-100" : "bg-white/5 text-slate-400"
                        }`}
                      >
                        #{destChannel.name}
                      </span>
                    )}
                  </button>
                );
              })
              )}
            </div>

            <div className="flex items-center gap-2 ml-auto">
              {panelDraft && (
                <button
                  type="button"
                  onClick={() => deploy(panelDraft.id)}
                  disabled={deployingPanelId === panelDraft.id || !panelDraft.channel_id}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md shadow-emerald-600/20 transition-all"
                  title={panelDraft.channel_id ? "Post this panel embed directly into Discord" : "Select a destination channel first"}
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{deployingPanelId === panelDraft.id ? "Deploying..." : "Post to Channel"}</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleAddNewPanel}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 text-xs font-semibold border border-indigo-500/20 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Panel</span>
              </button>
            </div>
          </div>

          {panelDraft ? (
            /* RESPONSIVE SPLIT / WIDE GRID: 5 COLS BUILDER / 7 COLS (OR 12 COLS) LIVE DISCORD SIMULATOR */
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
              {/* Panel Configuration Form */}
              <div className={`${isWideSimulator ? "hidden" : "xl:col-span-5"} space-y-6`}>
                <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-5 bg-slate-900/40">
                  <div className="flex items-center justify-between border-b border-white/5 pb-3">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Layers className="w-4 h-4 text-indigo-400" />
                      <span>Panel Embed Appearance</span>
                    </h3>
                    <button
                      type="button"
                      onClick={handleDeleteCurrentPanel}
                      className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1.5 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Panel</span>
                    </button>
                  </div>

                  {/* Channel Deployment Picker */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-200 mb-1.5">
                      Destination Channel (Where Panel is Sent)
                    </label>
                    <ChannelSelector
                      guildId={guildId}
                      channels={channels}
                      value={panelDraft.channel_id}
                      onChange={(val) => handleUpdateDraft("channel_id", val)}
                      allowedTypes={["text"]}
                      placeholder="Select channel to deploy ticket box..."
                    />
                  </div>

                  {/* Title & Color Palette */}
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Embed Title
                      </label>
                      <input
                        type="text"
                        value={panelDraft.title || ""}
                        onChange={(e) => handleUpdateDraft("title", e.target.value)}
                        placeholder="🎫 Support Tickets"
                        className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Accent Color
                      </label>
                      <div className="flex flex-wrap items-center gap-2">
                        {PRESET_COLORS.map((swatch) => (
                          <button
                            key={swatch.hex}
                            type="button"
                            onClick={() => handleUpdateDraft("color", swatch.hex)}
                            title={swatch.name}
                            style={{ backgroundColor: swatch.hex }}
                            className={`w-6 h-6 rounded-lg transition-transform ${
                              (panelDraft.color || "#6366F1").toLowerCase() === swatch.hex.toLowerCase()
                                ? "scale-110 ring-2 ring-white ring-offset-2 ring-offset-slate-950"
                                : "opacity-80 hover:opacity-100 hover:scale-105"
                            }`}
                          />
                        ))}
                        <div className="flex items-center gap-1.5 ml-1">
                          <input
                            type="color"
                            value={panelDraft.color || "#6366F1"}
                            onChange={(e) => handleUpdateDraft("color", e.target.value)}
                            className="w-7 h-7 rounded-lg border border-white/10 bg-transparent cursor-pointer p-0.5"
                          />
                          <input
                            type="text"
                            value={panelDraft.color || "#6366F1"}
                            onChange={(e) => handleUpdateDraft("color", e.target.value)}
                            className="w-20 bg-slate-950/60 border border-white/10 rounded-lg px-2 py-1 text-xs text-white font-mono focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Embed Description
                    </label>
                    <textarea
                      rows={3}
                      value={panelDraft.description || ""}
                      onChange={(e) => handleUpdateDraft("description", e.target.value)}
                      placeholder="Need assistance? Click a button or select a department below."
                      className="w-full bg-slate-950/60 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  {/* Banner Image URL */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Banner Image URL (Optional)
                    </label>
                    <input
                      type="url"
                      value={panelDraft.image_url || ""}
                      onChange={(e) => handleUpdateDraft("image_url", e.target.value)}
                      placeholder="https://example.com/banner.png"
                      className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Intake Interaction Method */}
                <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-5 bg-slate-900/40">
                  <div className="border-b border-white/5 pb-3">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Tag className="w-4 h-4 text-indigo-400" />
                      <span>Intake Interaction Method</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Choose how users trigger ticket creation when viewing this panel in Discord.
                    </p>
                  </div>

                  {/* Segmented Intake Selector */}
                  <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-950/60 border border-white/5">
                    <button
                      type="button"
                      onClick={() => handleUpdateDraft("enable_reason_categories", true)}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-lg text-xs font-semibold transition-all ${
                        panelDraft.enable_reason_categories
                          ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                          : "text-slate-400 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      <Layers className="w-4 h-4" />
                      <span>Department Dropdown</span>
                      <span className="text-[10px] font-normal opacity-80">Pick from menu</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleUpdateDraft("enable_reason_categories", false)}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-lg text-xs font-semibold transition-all ${
                        !panelDraft.enable_reason_categories
                          ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                          : "text-slate-400 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      <TicketIcon className="w-4 h-4" />
                      <span>Single Direct Button</span>
                      <span className="text-[10px] font-normal opacity-80">Instant click</span>
                    </button>
                  </div>

                  {panelDraft.enable_reason_categories ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Select Menu Placeholder
                        </label>
                        <input
                          type="text"
                          value={panelDraft.select_placeholder || ""}
                          onChange={(e) => handleUpdateDraft("select_placeholder", e.target.value)}
                          placeholder="Select a department or reason..."
                          className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                            <span>Configured Departments</span>
                            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-indigo-500/10 text-indigo-300 font-mono">
                              {(panelDraft.reason_categories || []).length}
                            </span>
                          </span>
                          <button
                            type="button"
                            onClick={handleAddReasonCategory}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 text-xs font-semibold border border-indigo-500/20 transition-all"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add Department</span>
                          </button>
                        </div>

                        {(panelDraft.reason_categories || []).length === 0 ? (
                          <div className="p-6 rounded-xl bg-slate-950/40 border border-dashed border-white/10 text-center space-y-2">
                            <Layers className="w-8 h-8 text-slate-500 mx-auto opacity-60" />
                            <p className="text-sm font-semibold text-slate-300">No departments configured yet</p>
                            <p className="text-xs text-slate-500 max-w-sm mx-auto">
                              Click &quot;Add Department&quot; above to create categories with optional custom routing and intake prompts, or switch to &quot;Single Direct Button&quot; for instant opening.
                            </p>
                            <button
                              type="button"
                              onClick={handleAddReasonCategory}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-all mt-2"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Add First Department</span>
                            </button>
                          </div>
                        ) : (
                          (panelDraft.reason_categories || []).map((cat: any) => (
                          <div
                            key={cat.id}
                            className="p-4 rounded-xl bg-slate-950/70 border border-white/5 hover:border-white/10 space-y-3 relative group transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <EmojiSelector
                                guildId={guildId}
                                value={cat.emoji || "📌"}
                                onChange={(val: string) => handleUpdateReasonCategory(cat.id, "emoji", val)}
                                multiple={false}
                              />
                              <input
                                type="text"
                                value={cat.label || ""}
                                onChange={(e) => handleUpdateReasonCategory(cat.id, "label", e.target.value)}
                                placeholder="Department Label (e.g. Billing, Technical Support)"
                                className="flex-1 bg-slate-900 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white font-semibold focus:outline-none focus:border-indigo-500"
                              />
                              <button
                                type="button"
                                onClick={() => handleRemoveReasonCategory(cat.id)}
                                title="Remove department"
                                className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>

                            <input
                              type="text"
                              value={cat.description || ""}
                              onChange={(e) => handleUpdateReasonCategory(cat.id, "description", e.target.value)}
                              placeholder="Brief description shown under department title in Discord menu..."
                              className="w-full bg-slate-900/80 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
                            />

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-white/5">
                              <div>
                                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                                  Routing Discord Category
                                </label>
                                <ChannelSelector
                                  channels={categoryChannels}
                                  value={cat.category_id || ""}
                                  onChange={(val: string) => handleUpdateReasonCategory(cat.id, "category_id", val)}
                                  allowedTypes={["category"]}
                                  specialOptions={[
                                    {
                                      value: "",
                                      label: "Default (Inherit Settings)",
                                      description: "Inherits default ticket category from Settings & Routing",
                                    },
                                  ]}
                                  placeholder="Inherit default category..."
                                />
                              </div>

                              <div className="flex items-center justify-between sm:justify-end gap-3 pt-3 sm:pt-4">
                                <div className="text-right">
                                  <span className="text-xs text-slate-300 block font-medium">Prompt User for Reason</span>
                                  <span className="text-[10px] text-slate-500 block">Shows popup modal before opening</span>
                                </div>
                                <Switch
                                  checked={Boolean(cat.require_reason)}
                                  onChange={(checked) => handleUpdateReasonCategory(cat.id, "require_reason", checked)}
                                />
                              </div>
                            </div>
                          </div>
                        ))
                        )}
                      </div>
                    </div>
                  ) : (
                    /* Single Button Configuration */
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Button Text
                        </label>
                        <input
                          type="text"
                          value={panelDraft.button_text || "Open Ticket"}
                          onChange={(e) => handleUpdateDraft("button_text", e.target.value)}
                          className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Button Emoji
                        </label>
                        <EmojiSelector
                          guildId={guildId}
                          value={panelDraft.button_emoji || "📩"}
                          onChange={(val: string) => handleUpdateDraft("button_emoji", val)}
                          multiple={false}
                        />
                      </div>
                    </div>
                  )}

                  {/* Deploy Action Bar */}
                  <div className="pt-4 border-t border-white/5 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={handleSaveCurrentPanel}
                      disabled={savingPanel}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                        isPanelDirty
                          ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/30 ring-2 ring-emerald-400/50"
                          : "bg-white/10 hover:bg-white/15 text-slate-300 hover:text-white"
                      }`}
                    >
                      <Save className="w-4 h-4" />
                      <span>{savingPanel ? "Saving..." : isPanelDirty ? "Save Changes *" : "Save Changes"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => deploy(panelDraft.id)}
                      disabled={deployingPanelId === panelDraft.id || !panelDraft.channel_id}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-md shadow-indigo-600/30 transition-all disabled:opacity-50"
                    >
                      <Send className="w-4 h-4" />
                      <span>{deployingPanelId === panelDraft.id ? "Deploying..." : "Post to Channel"}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Modern Live Discord Chat Simulator (Split 7 Cols or Full 12 Cols) */}
              <div className={`${isWideSimulator ? "xl:col-span-12" : "xl:col-span-7"} space-y-4`}>
                <div className="sticky top-6 space-y-3">
                  {/* Mode Selector & Status Header */}
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900/80 border border-white/10">
                      <button
                        type="button"
                        onClick={() => setPreviewMode("panel")}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          previewMode === "panel"
                            ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/30"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Ticket Panel</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewMode("channel")}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          previewMode === "channel"
                            ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/30"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        <Tag className="w-3.5 h-3.5" />
                        <span>Opened Ticket Room</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                        <span className="font-semibold text-slate-300">Modern Discord Chat Simulator</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsWideSimulator((prev) => !prev)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-xs font-semibold text-indigo-300 hover:text-white border border-white/10 transition-all shadow-sm"
                        title={isWideSimulator ? "Switch to side-by-side split view" : "Expand simulator to wide view"}
                      >
                        {isWideSimulator ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                        <span>{isWideSimulator ? "Split View" : "Wide View"}</span>
                      </button>
                    </div>
                  </div>

                  {/* Modern Discord Window Frame (Wider, Full-Width Within Column) */}
                  <div className="rounded-2xl bg-[#313338] border border-white/10 shadow-2xl overflow-hidden font-sans text-left w-full flex flex-col min-h-[620px]">
                    {/* Top Discord Channel Bar */}
                    <div className="h-12 px-4 bg-[#2b2d31] border-b border-black/20 flex items-center justify-between select-none shrink-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <Hash className="w-5 h-5 text-[#80848e] shrink-0" />
                        <span className="font-bold text-white text-sm truncate">
                          {previewMode === "panel" ? channelDisplayName : "ticket-0042-general"}
                        </span>
                        <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-white/10 text-xs text-[#949ba4] truncate">
                          {previewMode === "panel" ? "Open support & inquiries" : "Private Support Channel"}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 text-[#b5bac1]">
                        <Bell className="w-4 h-4 cursor-pointer hover:text-white transition-colors" />
                        <Pin className="w-4 h-4 cursor-pointer hover:text-white transition-colors" />
                        <Users className="w-4 h-4 cursor-pointer hover:text-white transition-colors" />
                        <div className="hidden sm:flex items-center gap-1 bg-[#1e1f22] px-2.5 py-1 rounded text-xs text-[#949ba4]">
                          <Search className="w-3.5 h-3.5" />
                          <span>Search</span>
                        </div>
                      </div>
                    </div>

                    {/* Discord Chat Area (Fluid & Generous Width) */}
                    <div className="p-4 sm:p-6 space-y-5 flex-1 overflow-y-auto min-h-[500px] max-h-[760px] scrollbar-thin">
                      {/* Date Divider */}
                      <div className="relative flex items-center justify-center my-2">
                        <div className="border-t border-white/[0.08] w-full absolute" />
                        <span className="bg-[#313338] px-3 z-10 text-[11px] font-bold text-[#949ba4] uppercase tracking-wider">
                          Today
                        </span>
                      </div>

                      {previewMode === "panel" ? (
                        /* MODE 1: PANEL EMBED & CONTROLS */
                        <div className="flex items-start gap-4 hover:bg-black/10 -mx-3 p-3 rounded-lg transition-colors">
                          {/* Bot Avatar */}
                          <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white shrink-0 font-bold text-sm shadow-md mt-0.5">
                            DV
                          </div>

                          <div className="flex-1 min-w-0 space-y-2.5 w-full">
                            {/* Author Row */}
                            <div className="flex items-baseline gap-2 flex-wrap">
                              <span className="font-semibold text-white text-sm hover:underline cursor-pointer">
                                DV Command
                              </span>
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#5865F2] text-white tracking-wide">
                                APP
                              </span>
                              <span className="text-[11px] text-[#949ba4]">
                                Today at 12:45 PM
                              </span>
                            </div>

                            {/* Embed Container (Wide Responsive Design) */}
                            <div
                              className="rounded-lg bg-[#2b2d31] p-5 border-l-4 space-y-3.5 shadow-md w-full max-w-3xl"
                              style={{ borderLeftColor: panelDraft.color || "#6366F1" }}
                            >
                              <h3 className="text-base font-bold text-white leading-snug">
                                {panelDraft.title || "🎫 Support Tickets"}
                              </h3>

                              <p className="text-sm text-[#dbdee1] leading-relaxed whitespace-pre-wrap">
                                {panelDraft.description || "Need assistance? Select a department below."}
                              </p>

                              {panelDraft.image_url && (
                                <div className="rounded-md overflow-hidden max-h-64 bg-black/30 border border-white/5">
                                  <img
                                    src={panelDraft.image_url}
                                    alt="Panel Banner"
                                    className="w-full h-full object-cover"
                                    onError={(e) => ((e.target as any).style.display = "none")}
                                  />
                                </div>
                              )}

                              <div className="pt-2 border-t border-white/5 flex items-center gap-1.5 text-[11px] text-[#949ba4]">
                                <span>Support System</span>
                                <span>•</span>
                                <span>Today at 12:45 PM</span>
                              </div>
                            </div>

                            {/* Interactive Component (Select Menu or Button) */}
                            <div className="w-full max-w-3xl pt-1">
                              {panelDraft.enable_reason_categories ? (
                                <div className="relative">
                                  <button
                                    type="button"
                                    onClick={() => setPreviewSelectOpen((prev) => !prev)}
                                    className="w-full p-3 rounded-md bg-[#2b2d31] hover:bg-[#35373c] border border-black/30 flex items-center justify-between text-sm text-[#dbdee1] transition-all shadow-sm"
                                  >
                                    <div className="flex items-center gap-2 truncate">
                                      <span className="text-slate-400">📩</span>
                                      <span className="truncate">{panelDraft.select_placeholder || "Select a department or reason..."}</span>
                                    </div>
                                    <ChevronDown
                                      className={`w-4 h-4 text-[#949ba4] transition-transform duration-200 shrink-0 ${
                                        previewSelectOpen ? "rotate-180" : ""
                                      }`}
                                    />
                                  </button>

                                  {/* Expanded Menu Dropdown */}
                                  {previewSelectOpen && (
                                    <div className="mt-1.5 p-1 rounded-md bg-[#2b2d31] border border-black/40 shadow-2xl space-y-1 z-20">
                                      {(panelDraft.reason_categories || []).length === 0 ? (
                                        <p className="p-3 text-xs text-[#949ba4] text-center">
                                          No categories added yet. Click "+ Add Category" in the editor.
                                        </p>
                                      ) : (
                                        (panelDraft.reason_categories || []).map((cat: any) => (
                                          <div
                                            key={cat.id}
                                            className="p-2.5 rounded hover:bg-[#404249] transition-colors cursor-pointer group flex items-start gap-2.5"
                                          >
                                            <span className="text-base shrink-0 mt-0.5 flex items-center justify-center">
                                              <EmojiBadge emoji={cat.emoji || "📌"} size="md" showName={false} bare={true} />
                                            </span>
                                            <div className="flex-1 min-w-0">
                                              <div className="flex items-center justify-between gap-2">
                                                <span className="text-sm font-semibold text-white truncate">
                                                  {cat.label || "Untitled Category"}
                                                </span>
                                                {cat.require_reason && (
                                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-indigo-500/20 text-indigo-300">
                                                    Intake Modal
                                                  </span>
                                                )}
                                              </div>
                                              {cat.description && (
                                                <p className="text-xs text-[#949ba4] truncate mt-0.5">
                                                  {cat.description}
                                                </p>
                                              )}
                                            </div>
                                          </div>
                                        ))
                                      )}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  className="flex items-center justify-center gap-2 py-2.5 px-5 rounded bg-[#5865F2] hover:bg-[#4752C4] text-white text-sm font-semibold shadow transition-all active:scale-95"
                                >
                                  <EmojiBadge emoji={panelDraft.button_emoji || "📩"} size="sm" showName={false} bare={true} />
                                  <span>{panelDraft.button_text || "Open Ticket"}</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* MODE 2: OPENED TICKET CHANNEL SIMULATION */
                        <div className="space-y-4">
                          {/* Channel Greeting */}
                          <div className="space-y-1.5 py-2 border-b border-white/[0.08]">
                            <div className="w-12 h-12 rounded-full bg-[#3f4147] flex items-center justify-center text-white font-bold text-xl">
                              #
                            </div>
                            <h2 className="text-lg font-bold text-white">Welcome to #ticket-0042-general!</h2>
                            <p className="text-xs text-[#949ba4]">
                              This is the start of the <strong className="text-white">#ticket-0042-general</strong> channel opened by <strong className="text-white">@CommunityUser</strong>.
                            </p>
                          </div>

                          {/* Welcome Bot Message */}
                          <div className="flex items-start gap-4 -mx-3 p-3 rounded-lg">
                            <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white shrink-0 font-bold text-sm shadow-md mt-0.5">
                              DV
                            </div>

                            <div className="flex-1 min-w-0 space-y-2.5 w-full">
                              <div className="flex items-baseline gap-2 flex-wrap">
                                <span className="font-semibold text-white text-sm">DV Command</span>
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#5865F2] text-white">APP</span>
                                <span className="text-[11px] text-[#949ba4]">Today at 12:46 PM</span>
                              </div>

                              <div className="text-xs text-[#dbdee1] flex items-center gap-1.5 flex-wrap">
                                <span className="px-1.5 py-0.5 rounded bg-[#5865F2]/20 text-[#c9cdfb] font-semibold">
                                  @Staff Team
                                </span>
                                <span className="px-1.5 py-0.5 rounded bg-[#5865F2]/20 text-[#c9cdfb] font-semibold">
                                  @CommunityUser
                                </span>
                              </div>

                              {/* Ticket Intake Dossier Embed */}
                              <div className="rounded-lg bg-[#2b2d31] p-5 border-l-4 border-indigo-500 space-y-3.5 shadow-md w-full max-w-3xl">
                                <div className="flex items-center justify-between flex-wrap gap-2">
                                  <h3 className="text-base font-bold text-white">
                                    🎫 Ticket #0042 • General Support
                                  </h3>
                                  <div className="flex items-center gap-1.5">
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 uppercase">
                                      High Priority
                                    </span>
                                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300">
                                      ⏱️ SLA: 48m left
                                    </span>
                                  </div>
                                </div>

                                <p className="text-xs text-[#dbdee1] leading-relaxed">
                                  Hello <strong className="text-white">@CommunityUser</strong>, welcome to your private support channel. Our team has been alerted and will assist you shortly.
                                </p>

                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs pt-1 border-t border-white/5">
                                  <div>
                                    <span className="text-[10px] text-[#949ba4] font-semibold uppercase block">📁 Department</span>
                                    <span className="text-white font-medium">❓ General Support</span>
                                  </div>
                                  <div>
                                    <span className="text-[10px] text-[#949ba4] font-semibold uppercase block">👤 Assigned Staff</span>
                                    <span className="text-indigo-300 font-medium">Unassigned</span>
                                  </div>
                                  <div>
                                    <span className="text-[10px] text-[#949ba4] font-semibold uppercase block">🛡️ Warnings</span>
                                    <span className="text-white font-medium">0 active warnings</span>
                                  </div>
                                </div>
                              </div>

                              {/* Interactive Action Buttons */}
                              <div className="flex items-center gap-2 flex-wrap pt-1 max-w-3xl">
                                <button
                                  type="button"
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#248046] hover:bg-[#1a6334] text-white text-xs font-semibold shadow transition-all"
                                >
                                  <span>🙋</span>
                                  <span>Claim Ticket</span>
                                </button>
                                <button
                                  type="button"
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#da373c] hover:bg-[#a1282c] text-white text-xs font-semibold shadow transition-all"
                                >
                                  <span>🔒</span>
                                  <span>Close Ticket</span>
                                </button>
                                <button
                                  type="button"
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#da373c] hover:bg-[#a1282c] text-white text-xs font-semibold shadow transition-all"
                                >
                                  <span>🗑️</span>
                                  <span>Delete Ticket</span>
                                </button>
                                <button
                                  type="button"
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#4e5058] hover:bg-[#6d6f78] text-white text-xs font-semibold shadow transition-all"
                                >
                                  <span>👤</span>
                                  <span>Assign</span>
                                </button>
                                <button
                                  type="button"
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#4e5058] hover:bg-[#6d6f78] text-white text-xs font-semibold shadow transition-all"
                                >
                                  <span>🚨</span>
                                  <span>Escalate</span>
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Community User Message */}
                          <div className="flex items-start gap-4 -mx-3 p-3 rounded-lg hover:bg-black/10 transition-colors">
                            <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center text-white shrink-0 font-bold text-sm shadow-md mt-0.5">
                              CU
                            </div>

                            <div className="flex-1 min-w-0 space-y-1">
                              <div className="flex items-baseline gap-2">
                                <span className="font-semibold text-white text-sm">CommunityUser</span>
                                <span className="text-[11px] text-[#949ba4]">Today at 12:47 PM</span>
                              </div>
                              <p className="text-sm text-[#dbdee1] leading-relaxed">
                                Hello! I wanted to check how to configure auto-roles for our Discord boosters. Thank you!
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Discord Modern Message Input Bar */}
                    <div className="p-3 bg-[#383a40] border-t border-black/20 shrink-0">
                      <div className="flex items-center gap-2.5 bg-[#404249] rounded-lg px-3 py-2 text-sm text-[#949ba4]">
                        <button type="button" className="p-1 rounded-full bg-[#4e5058] text-white hover:bg-[#5c5e66] transition-colors">
                          <Paperclip className="w-3.5 h-3.5" />
                        </button>
                        <span className="flex-1 text-xs select-none">
                          {previewMode === "panel" ? `Message #${channelDisplayName}` : "Message #ticket-0042-general"}
                        </span>
                        <div className="flex items-center gap-2 text-[#b5bac1]">
                          <Gift className="w-4 h-4 cursor-pointer hover:text-white" />
                          <span className="text-[10px] font-bold px-1 rounded bg-[#4e5058] cursor-pointer hover:text-white">GIF</span>
                          <Smile className="w-4 h-4 cursor-pointer hover:text-white" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-white/5 space-y-3">
              <Layers className="w-10 h-10 text-slate-600 mx-auto" />
              <h3 className="text-lg font-bold text-white">No Ticket Panels Created Yet</h3>
              <p className="text-sm text-slate-400 max-w-md mx-auto">
                Create your first ticket panel to deploy an interactive support box with reason categories in your Discord server.
              </p>
              <button
                type="button"
                onClick={handleAddNewPanel}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-md transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Create Panel</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: LIVE TICKET BROWSER & MANAGEMENT */}
      {activeTab === "browser" && (
        <div className="space-y-5">
          {/* Controls Bar: Filters & Search */}
          <div className="flex items-center justify-between gap-4 flex-wrap p-3.5 rounded-2xl bg-slate-900/60 border border-white/5">
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1">
              {["all", "open", "claimed", "escalated", "resolved", "closed"].map((st) => (
                <button
                  key={st}
                  onClick={() => {
                    setTicketFilter(st);
                    fetchTickets(st);
                  }}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                    ticketFilter === st
                      ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/30"
                      : "bg-white/5 text-slate-400 hover:text-white hover:bg-white/10"
                  }`}
                >
                  {st.replace("_", " ")}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 flex-1 max-w-sm">
              <div className="relative w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by ticket #, user, or reason..."
                  className="w-full bg-slate-950/70 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {filteredTickets.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-white/5 space-y-2">
              <TicketIcon className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-sm text-slate-400">No tickets found matching the selected filter or search.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2.5">
              {filteredTickets.map((t: any) => {
                const isUrgent = t.priority === "urgent";
                const isEscalated = t.status === "escalated";

                return (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTicket(t)}
                    className="p-4 rounded-xl bg-slate-900/60 border border-white/5 flex items-center justify-between gap-4 flex-wrap hover:border-indigo-500/30 hover:bg-slate-900/80 cursor-pointer transition-all group"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <span className="px-3 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 font-mono text-sm font-bold text-indigo-400 group-hover:bg-indigo-500/20 shrink-0">
                        #{t.ticket_number}
                      </span>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-white group-hover:text-indigo-200 transition-colors truncate">
                            {t.category_name || "General Support"}
                          </span>

                          {/* Status Pill */}
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              t.status === "open"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : t.status === "claimed"
                                ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                                : t.status === "escalated"
                                ? "bg-rose-500/10 text-rose-400 border border-rose-500/20 animate-pulse"
                                : t.status === "resolved"
                                ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                                : "bg-slate-500/10 text-slate-400 border border-slate-500/20"
                            }`}
                          >
                            {t.status}
                          </span>

                          {/* Priority Pill */}
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              isUrgent
                                ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                                : t.priority === "high"
                                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                : "bg-white/5 text-slate-400"
                            }`}
                          >
                            {t.priority || "normal"}
                          </span>

                          {t.voice_channel_id && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              🎙️ Active Call
                            </span>
                          )}
                        </div>

                        <span className="text-xs text-slate-400 block mt-0.5">
                          Opened by <strong className="text-slate-300">{t.user_tag}</strong> • {new Date(t.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-slate-400">
                      {t.reason && (
                        <span className="max-w-xs truncate text-xs text-slate-400 italic hidden md:inline">
                          "{t.reason}"
                        </span>
                      )}
                      {t.claimed_by_tag && (
                        <span className="flex items-center gap-1.5 text-xs text-indigo-300">
                          <UserCheck className="w-4 h-4" />
                          <span>{t.claimed_by_tag}</span>
                        </span>
                      )}
                      <span className="text-xs text-indigo-400 font-semibold group-hover:underline flex items-center gap-1">
                        Inspect
                        <Eye className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ANALYTICS & SLA PERFORMANCE */}
      {activeTab === "analytics" && (
        <div className="space-y-6">
          {/* Top Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-white/5 space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-semibold uppercase tracking-wider">Total Tickets</span>
                <TicketIcon className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="text-2xl font-bold text-white font-mono">{analytics?.total ?? ticketsData.total}</div>
              <p className="text-[11px] text-slate-400">Lifetime server support sessions</p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/60 border border-white/5 space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-semibold uppercase tracking-wider">CSAT Score</span>
                <Star className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-bold text-amber-300 font-mono flex items-center gap-1.5">
                <span>{analytics?.csatScore ?? "5.0"}</span>
                <span className="text-xs text-slate-400 font-normal">/ 5.0</span>
              </div>
              <p className="text-[11px] text-slate-400">{analytics?.totalRatings ?? 0} user reviews submitted</p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/60 border border-white/5 space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-semibold uppercase tracking-wider">Avg Response Time</span>
                <Clock className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-bold text-emerald-300 font-mono">
                {analytics?.avgResponseMinutes ?? 12} <span className="text-xs font-normal">mins</span>
              </div>
              <p className="text-[11px] text-slate-400">First staff response milestone</p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/60 border border-white/5 space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-semibold uppercase tracking-wider">Avg Resolution Time</span>
                <Activity className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-2xl font-bold text-purple-300 font-mono">
                {analytics?.avgResolutionHours ?? 2.4} <span className="text-xs font-normal">hours</span>
              </div>
              <p className="text-[11px] text-slate-400">Target SLA closure velocity</p>
            </div>
          </div>

          {/* Staff Leaderboard */}
          <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-4 bg-slate-900/40">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400" />
              <span>Staff Support Workload & Leaderboard</span>
            </h3>

            {(analytics?.staffLeaderboard || []).length === 0 ? (
              <p className="text-sm text-slate-400 py-4 text-center">
                No staff assignments recorded yet. Staff members who claim and resolve tickets will be ranked here.
              </p>
            ) : (
              <div className="space-y-2">
                {analytics.staffLeaderboard.map((st: any, idx: number) => (
                  <div
                    key={st.staffId}
                    className="p-3.5 rounded-xl bg-slate-950/60 border border-white/5 flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 text-center font-bold text-xs text-slate-400">
                        #{idx + 1}
                      </span>
                      <span className="text-sm font-semibold text-white">{st.tag}</span>
                    </div>

                    <div className="flex items-center gap-6 text-xs">
                      <div>
                        <span className="text-slate-400 mr-1.5">Assigned:</span>
                        <strong className="text-white font-mono">{st.totalAssigned}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 mr-1.5">Resolved:</span>
                        <strong className="text-emerald-400 font-mono">{st.totalResolved}</strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: GENERAL & ROUTING SETTINGS */}
      {activeTab === "settings" && (
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-6 bg-slate-900/40">
            <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-white/5 pb-3">
              <Shield className="w-4 h-4 text-indigo-400" />
              <span>Routing Channels & Permissions</span>
            </h3>

            {/* Logging Channel */}
            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-1.5">
                Ticket Activity Logs Channel
              </label>
              <p className="text-sm text-slate-400 mb-2">
                Discord channel where real-time ticket events (created, claimed, member added/removed, closed) are logged.
              </p>
              <ChannelSelector
                guildId={guildId}
                channels={channels}
                value={config.logging_channel_id}
                onChange={(val) => updateConfigField("logging_channel_id", val)}
                allowedTypes={["text"]}
                placeholder="Select activity audit logs channel..."
              />
            </div>

            {/* Transcript Log Channel */}
            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-1.5">
                Transcript Archive Channel
              </label>
              <p className="text-sm text-slate-400 mb-2">
                Channel where completed HTML transcripts and close summaries are sent upon ticket resolution.
              </p>
              <ChannelSelector
                guildId={guildId}
                channels={channels}
                value={config.transcript_channel_id}
                onChange={(val) => updateConfigField("transcript_channel_id", val)}
                allowedTypes={["text"]}
                placeholder="Select transcripts log channel..."
              />
            </div>

            {/* Save & Archive Transcripts Toggle */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-950/50 border border-white/5">
              <div>
                <span className="text-sm font-semibold text-white block">
                  Save & Archive Transcripts
                </span>
                <span className="text-xs text-slate-400 block mt-0.5">
                  Compile full HTML chat transcripts upon ticket resolution. When disabled, transcripts are not saved or sent to users.
                </span>
              </div>
              <Switch
                checked={config.save_transcripts !== false}
                onChange={(checked) => updateConfigField("save_transcripts", checked)}
              />
            </div>

            {/* Category Dropdown with Live Refresh Button */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-semibold text-slate-200">
                  Default Ticket Category (Discord Category)
                </label>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-indigo-400 font-mono">
                    {categoryChannels.length} {categoryChannels.length === 1 ? "category" : "categories"} found
                  </span>
                  <button
                    type="button"
                    onClick={handleRefreshServerMeta}
                    disabled={isRefreshingMeta}
                    className="flex items-center gap-1 text-xs text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 px-2.5 py-1 rounded-lg border border-white/10 transition-colors"
                  >
                    <RefreshCw className={`w-3 h-3 ${isRefreshingMeta ? "animate-spin" : ""}`} />
                    <span>Refresh</span>
                  </button>
                </div>
              </div>
              <p className="text-sm text-slate-400 mb-2">
                The Discord channel category where newly created ticket channels are placed by default.
              </p>
              <ChannelSelector
                guildId={guildId}
                channels={categoryChannels}
                value={config.category_id || ""}
                onChange={(val: string) => updateConfigField("category_id", val)}
                allowedTypes={["category"]}
                specialOptions={[
                  {
                    value: "",
                    label: "None (Spawn in server root)",
                    description: "Spawn ticket channels at the server top level without a category",
                  },
                ]}
                placeholder="Select or search Discord category..."
              />
              {categoryChannels.length === 0 && (
                <div className="mt-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-semibold text-amber-200">No Discord channel categories detected</p>
                    <p className="text-amber-300/80 leading-relaxed">
                      Tickets will spawn in the server root by default. If your Discord server already has categories (or if you just created one), click <strong>Refresh</strong> above to force a live sync with Discord.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Authorized Roles */}
            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-1.5">
                Authorized Support Roles
              </label>
              <p className="text-sm text-slate-400 mb-2">
                Staff roles granted automatic access to view, claim, and close all tickets.
              </p>
              <RoleSelector
                roles={roles}
                multiple={true}
                value={config.support_role_ids}
                onChange={(val) => updateConfigField("support_role_ids", val)}
                placeholder="Choose support / mod roles..."
              />
            </div>

            {/* Channel Name Pattern */}
            <div className="p-5 rounded-xl bg-slate-950/50 border border-white/5 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <label className="block text-sm font-semibold text-white">
                      Ticket Channel Naming Pattern
                    </label>
                    {![
                      "ticket-{number}",
                      "ticket-{username}",
                      "tkt-{number}-{username}",
                      "{category}-{number}",
                    ].includes((config.channel_name_pattern || "ticket-{number}").trim()) && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        ✨ Custom Name
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">
                    Define how Discord channels are named when opened. Type any custom name or use dynamic tags.
                  </p>
                </div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-xs font-mono text-indigo-300">
                  <span className="text-slate-400 font-sans">Preview:</span>
                  <span className="font-semibold text-white">#{channelPreview}</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={config.channel_name_pattern !== undefined ? config.channel_name_pattern : "ticket-{number}"}
                    onChange={(e) => updateConfigField("channel_name_pattern", e.target.value)}
                    placeholder="e.g. ticket-{number}, support-{username}, my-ticket"
                    maxLength={64}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                  {config.channel_name_pattern && (
                    <button
                      type="button"
                      onClick={() => updateConfigField("channel_name_pattern", "")}
                      title="Clear custom name"
                      className="absolute right-3 text-xs text-slate-400 hover:text-white px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Preset suggestions & Tags */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] font-medium text-slate-400 mr-1">Presets:</span>
                  {[
                    "ticket-{number}",
                    "ticket-{username}",
                    "tkt-{number}-{username}",
                    "{category}-{number}",
                  ].map((preset) => {
                    const isSelected = (config.channel_name_pattern || "ticket-{number}").trim() === preset;
                    return (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => updateConfigField("channel_name_pattern", preset)}
                        className={`text-[11px] font-mono px-2 py-0.5 rounded-md border transition-all ${
                          isSelected
                            ? "bg-indigo-600/30 border-indigo-500/40 text-indigo-200"
                            : "bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10"
                        }`}
                      >
                        {preset}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => updateConfigField("channel_name_pattern", "ticket-{number}")}
                    className="text-[11px] font-sans px-2 py-0.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-all"
                  >
                    Reset
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  <span className="text-[11px] font-medium text-slate-400 mr-1">Insert Tag:</span>
                  {[
                    { tag: "{number}", desc: "0042 (padded)" },
                    { tag: "{count}", desc: "42 (raw)" },
                    { tag: "{username}", desc: "opener username" },
                    { tag: "{display_name}", desc: "server nickname" },
                    { tag: "{category}", desc: "department" },
                  ].map((item) => (
                    <button
                      key={item.tag}
                      type="button"
                      onClick={() => {
                        const current = config.channel_name_pattern !== undefined ? config.channel_name_pattern : "ticket-{number}";
                        if (!current.includes(item.tag)) {
                          updateConfigField("channel_name_pattern", current ? `${current}-${item.tag}` : item.tag);
                        }
                      }}
                      title={item.desc}
                      className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-white/5 border border-white/5 text-slate-400 hover:text-indigo-300 hover:border-indigo-500/30 hover:bg-indigo-500/10 transition-all"
                    >
                      {item.tag}
                    </button>
                  ))}
                </div>

                {/* Static name helper */}
                {config.channel_name_pattern &&
                  !config.channel_name_pattern.includes("{") && (
                    <p className="text-[11px] text-amber-400/90 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-lg flex items-center gap-1.5 mt-2">
                      <span>💡 <strong>Static Name:</strong> All channels opened with this pattern will be named <code>#{channelPreview}</code>. You can add <code>&#123;number&#125;</code> or <code>&#123;username&#125;</code> if you want unique names per ticket.</span>
                    </p>
                  )}
              </div>
            </div>

            {/* Quota & Counter */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div className="p-4 rounded-xl bg-slate-950/50 border border-white/5 space-y-2">
                <span className="text-sm font-semibold text-white block">Next Ticket Starting Number</span>
                <span className="text-xs text-slate-400 block">
                  Set the starting sequential number for new tickets (e.g. 1000).
                </span>
                <div className="flex items-center gap-3 pt-1">
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs font-mono text-slate-500">#</span>
                    <input
                      type="number"
                      min={1}
                      max={999999}
                      value={counterInputVal}
                      onChange={(e) => {
                        const raw = e.target.value;
                        setCounterInputVal(raw);
                        if (raw.trim() !== "") {
                          const parsed = parseInt(raw, 10);
                          if (!isNaN(parsed) && parsed >= 1) {
                            updateConfigField("ticket_counter", parsed - 1);
                          }
                        }
                      }}
                      onBlur={() => {
                        if (!counterInputVal || parseInt(counterInputVal, 10) < 1) {
                          const fallback = (Number(config.ticket_counter) || 0) + 1;
                          setCounterInputVal(String(fallback));
                        }
                      }}
                      className="w-32 bg-slate-900 border border-white/10 rounded-xl pl-7 pr-3 py-1.5 text-sm text-white font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <span className="text-xs text-slate-500 font-mono">
                    Last used: #{config.ticket_counter || 0}
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/50 border border-white/5 space-y-2">
                <span className="text-sm font-semibold text-white block">Max Open Tickets Per User</span>
                <span className="text-xs text-slate-400 block">
                  Prevents users from spamming multiple open tickets simultaneously.
                </span>
                <div className="pt-1">
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={config.max_tickets_per_user || 3}
                    onChange={(e) => updateConfigField("max_tickets_per_user", Math.max(1, Number(e.target.value)))}
                    className="w-24 bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-sm text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-white/5 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                {hasConfigChanges ? "You have unsaved configuration changes." : "All ticket settings are saved."}
              </span>
              <button
                type="button"
                onClick={() => saveConfig()}
                disabled={savingConfig}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  hasConfigChanges
                    ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 ring-2 ring-indigo-400/50"
                    : "bg-white/10 hover:bg-white/15 text-slate-300 hover:text-white"
                }`}
              >
                <Check className="w-4 h-4" />
                <span>{savingConfig ? "Saving..." : "Save Settings"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADVANCED TICKET INSPECTOR MODAL */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-2xl border border-white/10 max-w-2xl w-full bg-slate-900/95 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/5 pb-3 shrink-0">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 font-mono text-base font-bold text-indigo-400">
                  #{selectedTicket.ticket_number}
                </span>
                <div>
                  <h3 className="text-base font-bold text-white leading-tight">
                    {selectedTicket.category_name || "General Support"}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Opened by {selectedTicket.user_tag} ({selectedTicket.user_id})
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedTicket(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Status Action Bar */}
            <div className="flex items-center gap-2 flex-wrap pb-2 border-b border-white/5 shrink-0">
              <span className="text-xs text-slate-400 font-semibold mr-1">Quick Action:</span>
              {selectedTicket.status === "closed" ? (
                <button
                  type="button"
                  onClick={() => handleStateTransition("reopened", "Reopened from dashboard")}
                  className="px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 text-xs font-semibold transition-colors flex items-center gap-1.5"
                >
                  <span>🔓 Reopen Ticket</span>
                </button>
              ) : (
                <>
                  {selectedTicket.status !== "claimed" && (
                    <button
                      type="button"
                      onClick={() => handleStateTransition("claimed")}
                      className="px-2.5 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 text-xs font-semibold transition-colors"
                    >
                      Claim Ticket
                    </button>
                  )}
                  {selectedTicket.status !== "escalated" && (
                    <button
                      type="button"
                      onClick={() => handleStateTransition("escalated", "Escalated from dashboard")}
                      className="px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 text-xs font-semibold transition-colors"
                    >
                      Escalate
                    </button>
                  )}
                  {selectedTicket.status !== "resolved" && (
                    <button
                      type="button"
                      onClick={() => handleStateTransition("resolved", "Resolved by staff in dashboard")}
                      className="px-2.5 py-1 rounded-lg bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 text-xs font-semibold transition-colors"
                    >
                      Mark Resolved
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleStateTransition("closed", "Closed from dashboard")}
                    className="px-2.5 py-1 rounded-lg bg-slate-700/50 text-slate-300 hover:bg-slate-700 text-xs font-semibold transition-colors"
                  >
                    Close
                  </button>
                </>
              )}
            </div>

            {/* Modal Tabs */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setModalTab("dossier")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  modalTab === "dossier" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                Ticket Dossier
              </button>
              <button
                type="button"
                onClick={() => setModalTab("notes")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  modalTab === "notes" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                <span>Internal Notes</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/10 font-mono">
                  {ticketNotesList.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setModalTab("events")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  modalTab === "events" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                <span>Audit Timeline</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/10 font-mono">
                  {ticketEventsList.length}
                </span>
              </button>
            </div>

            {/* Modal Tab Content */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin">
              {modalTab === "dossier" && (
                <div className="space-y-3 text-sm">
                  <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-950/60 border border-white/5">
                    <div>
                      <span className="text-[11px] font-semibold text-slate-400 block uppercase">Status</span>
                      <span className="font-semibold text-white capitalize">{selectedTicket.status}</span>
                    </div>
                    <div>
                      <span className="text-[11px] font-semibold text-slate-400 block uppercase">Priority</span>
                      <span className="font-semibold text-indigo-300 uppercase">{selectedTicket.priority || "normal"}</span>
                    </div>
                    <div>
                      <span className="text-[11px] font-semibold text-slate-400 block uppercase">Opened At</span>
                      <span className="font-semibold text-white text-xs">{new Date(selectedTicket.created_at).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-[11px] font-semibold text-slate-400 block uppercase">Assigned To</span>
                      <span className="font-semibold text-white text-xs">
                        {selectedTicket.claimed_by_tag || "Unassigned"}
                      </span>
                    </div>
                  </div>

                  {selectedTicket.reason && (
                    <div className="p-3.5 rounded-xl bg-slate-950/60 border border-white/5 space-y-1">
                      <span className="text-[11px] font-semibold text-slate-400 block uppercase">Intake Reason / Details</span>
                      <p className="text-xs text-slate-200 whitespace-pre-wrap">{selectedTicket.reason}</p>
                    </div>
                  )}

                  {selectedTicket.close_reason && (
                    <div className="p-3.5 rounded-xl bg-slate-950/60 border border-white/5 space-y-1">
                      <span className="text-[11px] font-semibold text-slate-400 block uppercase">Resolution Summary</span>
                      <p className="text-xs text-slate-200 whitespace-pre-wrap">{selectedTicket.close_reason}</p>
                    </div>
                  )}
                </div>
              )}

              {modalTab === "notes" && (
                <div className="space-y-4">
                  {/* Add Note Form */}
                  <form onSubmit={handleCreateNote} className="space-y-2">
                    <textarea
                      rows={2}
                      value={newNoteContent}
                      onChange={(e) => setNewNoteContent(e.target.value)}
                      placeholder="Type a private staff note (hidden from customer)..."
                      className="w-full bg-slate-950/70 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={isSubmittingNote || !newNoteContent.trim()}
                        className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold transition-colors"
                      >
                        {isSubmittingNote ? "Adding..." : "Add Staff Note"}
                      </button>
                    </div>
                  </form>

                  {/* Notes List */}
                  {ticketNotesList.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-4">No internal staff notes recorded.</p>
                  ) : (
                    <div className="space-y-2">
                      {ticketNotesList.map((n) => (
                        <div key={n.id} className="p-3 rounded-xl bg-slate-950/60 border border-white/5 space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-indigo-300">{n.author_tag}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-slate-500">{new Date(n.created_at).toLocaleString()}</span>
                              <button
                                type="button"
                                onClick={() => handleDeleteNote(n.id)}
                                className="text-slate-500 hover:text-rose-400 transition-colors"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                          <p className="text-xs text-slate-200">{n.content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {modalTab === "events" && (
                <div className="space-y-2">
                  {ticketEventsList.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-4">No events recorded in audit timeline.</p>
                  ) : (
                    ticketEventsList.map((evt) => (
                      <div key={evt.id} className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-950/50 border border-white/5 text-xs">
                        <Activity className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-white capitalize">{evt.event_type.replace(/_/g, " ")}</span>
                            <span className="text-[10px] text-slate-500">{new Date(evt.created_at).toLocaleString()}</span>
                          </div>
                          <span className="text-slate-400 text-[11px]">
                            By <strong className="text-slate-300">{evt.actor_tag}</strong>
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/5 shrink-0">
              <button
                type="button"
                onClick={() => setSelectedTicket(null)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold transition-all"
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE PANEL MODAL */}
      <ConfirmDialog
        open={Boolean(panelToDelete)}
        onClose={() => !isDeletingPanel && setPanelToDelete(null)}
        onConfirm={handleConfirmDeletePanel}
        isPending={isDeletingPanel}
        danger={true}
        title="Delete Ticket Panel"
        description={
          panelToDelete
            ? `Are you sure you want to delete "${panelToDelete.title || "this panel"}"? This will permanently remove its configuration and delete any messages posted from this panel in Discord.`
            : ""
        }
        confirmText="Delete Panel"
        cancelText="Cancel"
      />
    </div>
  );
}
