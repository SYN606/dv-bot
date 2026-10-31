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
  FolderPlus,
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
} from "lucide-react";
import { useTickets, DEFAULT_PANEL } from "../../hooks/tickets/useTickets";
import { PageHeader, PageSkeleton, PageError, Switch, Tabs } from "../../components/ui";
import { ChannelSelector, RoleSelector } from "../../components/discord";

export default function TicketsPage({ showToast }) {
  const { guildId } = useParams();
  const [activeTab, setActiveTab] = useState("panels");
  const [ticketFilter, setTicketFilter] = useState("all");
  const [selectedPanelIndex, setSelectedPanelIndex] = useState(0);

  const {
    config,
    panels,
    ticketsData,
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
    refresh,
  } = useTickets(guildId, showToast);

  // Local draft state for the selected panel to prevent per-keystroke API spamming
  const [panelDraft, setPanelDraft] = useState<any>(null);

  const activePanelFromDb = panels[selectedPanelIndex] || null;

  useEffect(() => {
    if (activePanelFromDb) {
      setPanelDraft(JSON.parse(JSON.stringify(activePanelFromDb)));
    } else if (panels.length === 0) {
      setPanelDraft(null);
    }
  }, [selectedPanelIndex, panels]);

  const isPanelDirty = useMemo(() => {
    if (!panelDraft || !activePanelFromDb) return false;
    return JSON.stringify(panelDraft) !== JSON.stringify(activePanelFromDb);
  }, [panelDraft, activePanelFromDb]);

  if (loading) {
    return <PageSkeleton cards={3} rows={0} />;
  }

  if (error) {
    return <PageError title="Failed to load ticket system" description={error} onRetry={refresh} />;
  }

  const handleAddNewPanel = () => {
    const newPanel = {
      ...DEFAULT_PANEL,
      id: `pnl_${Math.random().toString(36).substring(2, 9)}`,
      title: `🎫 Support Panel #${panels.length + 1}`,
    };
    savePanel(newPanel).then((saved) => {
      if (saved) {
        setSelectedPanelIndex(panels.length);
        setPanelDraft(JSON.parse(JSON.stringify(saved)));
      }
    });
  };

  const handleUpdateDraft = (key: string, value: any) => {
    setPanelDraft((prev: any) => (prev ? { ...prev, [key]: value } : prev));
  };

  const handleSaveCurrentPanel = async () => {
    if (!panelDraft) return;
    const saved = await savePanel(panelDraft);
    if (saved) {
      setPanelDraft(JSON.parse(JSON.stringify(saved)));
    }
  };

  const handleDeployCurrentPanel = async () => {
    if (!panelDraft) return;
    if (isPanelDirty) {
      await savePanel(panelDraft);
    }
    await deploy(panelDraft.id);
  };

  const handleAddReasonCategory = () => {
    if (!panelDraft) return;
    const existing = panelDraft.reason_categories || [];
    const newCat = {
      id: `cat_${Date.now()}`,
      label: "New Department",
      emoji: "📌",
      description: "Describe what this category is for",
      require_reason: true,
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

  const tabs = [
    { id: "panels", label: "Panels & Reason Categories", icon: Layers },
    { id: "settings", label: "General & Routing Rules", icon: Shield },
    { id: "stream", label: `Ticket Archive (${ticketsData.total})`, icon: FileText },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Header */}
      <PageHeader
        category="COMMUNITY & SUPPORT"
        title="Ticket Tooling"
        description="Build multi-department ticket panels with optional reason categories, intake modals, auto-role routing, and permanent HTML transcripts."
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

      {/* TAB 1: PANELS & REASON CATEGORIES */}
      {activeTab === "panels" && (
        <div className="space-y-6">
          {/* Panel Selector Bar */}
          <div className="flex items-center justify-between flex-wrap gap-3 p-3 rounded-2xl bg-slate-900/60 border border-white/5">
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1">
              {panels.map((p, idx) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPanelIndex(idx)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
                    selectedPanelIndex === idx
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                      : "bg-white/5 text-slate-300 hover:text-white hover:bg-white/10"
                  }`}
                >
                  {p.title || `Panel #${idx + 1}`}
                </button>
              ))}
            </div>

            <button
              onClick={handleAddNewPanel}
              disabled={savingPanel}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm font-semibold border border-white/10 transition-all ml-auto"
            >
              <Plus className="w-4 h-4 text-indigo-400" />
              <span>Create New Panel</span>
            </button>
          </div>

          {panelDraft ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left 2 Cols: Panel Config & Reason Categories */}
              <div className="lg:col-span-2 space-y-6">
                {/* Panel Details Card */}
                <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-5 bg-slate-900/60">
                  <div className="flex items-center justify-between border-b border-white/5 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                        <Layers className="w-4.5 h-4.5" />
                      </div>
                      <div>
                        <h2 className="text-base font-bold text-white tracking-wide">Panel Appearance & Destination</h2>
                        <p className="text-sm text-slate-400">Where this panel lives and how it presents to server members.</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <button
                        onClick={handleSaveCurrentPanel}
                        disabled={savingPanel || !panelDraft}
                        className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 ${
                          isPanelDirty
                            ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20"
                            : "bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10"
                        }`}
                      >
                        <Save className="w-4 h-4" />
                        <span>{savingPanel ? "Saving..." : isPanelDirty ? "Save Panel *" : "Save Panel"}</span>
                      </button>

                      <button
                        onClick={handleDeployCurrentPanel}
                        disabled={deployingPanelId === panelDraft.id || !panelDraft.channel_id}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50"
                        title="Deploy or refresh panel in Discord"
                      >
                        <Send className="w-4 h-4" />
                        <span>{deployingPanelId === panelDraft.id ? "Deploying..." : "Post to Channel"}</span>
                      </button>

                      {panels.length > 1 && (
                        <button
                          onClick={() => removePanel(panelDraft.id)}
                          className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-all"
                          title="Delete Panel"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-semibold text-slate-200 mb-1.5">
                        Destination Channel <span className="text-rose-400">*</span>
                      </label>
                      <ChannelSelector
                        guildId={guildId}
                        channels={channels}
                        value={panelDraft.channel_id}
                        onChange={(val) => handleUpdateDraft("channel_id", val)}
                        allowedTypes={["text"]}
                        placeholder="Select channel (e.g. #tickets)..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-200 mb-1.5">
                        Embed Accent Color
                      </label>
                      <div className="flex items-center gap-2.5">
                        <input
                          type="color"
                          value={panelDraft.color || "#6366F1"}
                          onChange={(e) => handleUpdateDraft("color", e.target.value)}
                          className="w-10 h-10 rounded-xl border border-white/10 bg-transparent cursor-pointer p-0.5"
                        />
                        <input
                          type="text"
                          value={panelDraft.color || "#6366F1"}
                          onChange={(e) => handleUpdateDraft("color", e.target.value)}
                          className="flex-1 bg-slate-950/60 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white font-mono focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-200 mb-1.5">
                        Panel Title
                      </label>
                      <input
                        type="text"
                        value={panelDraft.title}
                        onChange={(e) => handleUpdateDraft("title", e.target.value)}
                        placeholder="e.g. 🎫 Support & Inquiries"
                        className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-200 mb-1.5">
                        Panel Description
                      </label>
                      <textarea
                        rows={3}
                        value={panelDraft.description}
                        onChange={(e) => handleUpdateDraft("description", e.target.value)}
                        placeholder="Explain how users can get support..."
                        className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Optional Reason Categories Builder */}
                <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-5 bg-slate-900/60">
                  <div className="flex items-center justify-between border-b border-white/5 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400">
                        <Tag className="w-4.5 h-4.5" />
                      </div>
                      <div>
                        <h2 className="text-base font-bold text-white tracking-wide">Reason Categories (Optional)</h2>
                        <p className="text-sm text-slate-400">
                          Allow users to pick a department or reason, prompting for specific details via modal.
                        </p>
                      </div>
                    </div>

                    <Switch
                      checked={panelDraft.enable_reason_categories}
                      onChange={(val) => handleUpdateDraft("enable_reason_categories", val)}
                      size="sm"
                    />
                  </div>

                  {panelDraft.enable_reason_categories ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-slate-200 mb-1.5">
                          Select Menu Placeholder
                        </label>
                        <input
                          type="text"
                          value={panelDraft.select_placeholder}
                          onChange={(e) => handleUpdateDraft("select_placeholder", e.target.value)}
                          placeholder="Select a department or reason..."
                          className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      {/* List of reason categories */}
                      <div className="space-y-3 pt-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                            Configured Reason Categories ({panelDraft.reason_categories?.length || 0})
                          </span>
                          <button
                            type="button"
                            onClick={handleAddReasonCategory}
                            className="flex items-center gap-1.5 text-sm text-indigo-400 hover:text-indigo-300 font-semibold"
                          >
                            <Plus className="w-4 h-4" />
                            <span>Add Category</span>
                          </button>
                        </div>

                        {(panelDraft.reason_categories || []).map((cat: any, cIdx: number) => (
                          <div
                            key={cat.id || cIdx}
                            className="p-4 rounded-xl bg-slate-950/60 border border-white/5 space-y-3.5 relative group"
                          >
                            <div className="flex items-center gap-2.5">
                              <input
                                type="text"
                                value={cat.emoji || "📌"}
                                onChange={(e) => handleUpdateReasonCategory(cat.id, "emoji", e.target.value)}
                                className="w-12 text-center bg-slate-900 border border-white/10 rounded-xl py-2 text-base focus:outline-none"
                                title="Emoji"
                              />
                              <input
                                type="text"
                                value={cat.label}
                                onChange={(e) => handleUpdateReasonCategory(cat.id, "label", e.target.value)}
                                placeholder="Department / Reason Title"
                                className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                              />
                              <button
                                type="button"
                                onClick={() => handleRemoveReasonCategory(cat.id)}
                                className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                                title="Remove reason category"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>

                            <input
                              type="text"
                              value={cat.description || ""}
                              onChange={(e) => handleUpdateReasonCategory(cat.id, "description", e.target.value)}
                              placeholder="Brief description shown under dropdown option..."
                              className="w-full bg-slate-900/60 border border-white/5 rounded-xl px-3.5 py-1.5 text-xs text-slate-300 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                            />

                            <div className="flex items-center justify-between pt-1 border-t border-white/5">
                              <div>
                                <span className="text-sm font-semibold text-white block">Prompt for Reason (Modal)</span>
                                <span className="text-xs text-slate-400 block">
                                  Opens a modal asking the member to describe their issue before creating the ticket.
                                </span>
                              </div>
                              <Switch
                                checked={Boolean(cat.require_reason)}
                                onChange={(val) => handleUpdateReasonCategory(cat.id, "require_reason", val)}
                                size="sm"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    /* Single Button Settings if Reason Categories are disabled */
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-slate-200 mb-1.5">
                          Button Text
                        </label>
                        <input
                          type="text"
                          value={panelDraft.button_text}
                          onChange={(e) => handleUpdateDraft("button_text", e.target.value)}
                          placeholder="Open Ticket"
                          className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-200 mb-1.5">
                          Button Emoji
                        </label>
                        <input
                          type="text"
                          value={panelDraft.button_emoji}
                          onChange={(e) => handleUpdateDraft("button_emoji", e.target.value)}
                          placeholder="📩"
                          className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Panel Bottom Action Bar */}
                <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-900/60 border border-white/5">
                  <span className="text-xs text-slate-400">
                    {isPanelDirty ? "You have unsaved changes to this panel." : "Panel settings are up to date."}
                  </span>
                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={handleSaveCurrentPanel}
                      disabled={savingPanel || !panelDraft}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 ${
                        isPanelDirty
                          ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/30 ring-2 ring-emerald-400/40"
                          : "bg-white/10 hover:bg-white/15 text-slate-200"
                      }`}
                    >
                      <Save className="w-4 h-4" />
                      <span>{savingPanel ? "Saving..." : isPanelDirty ? "Save Panel *" : "Save Panel"}</span>
                    </button>
                    <button
                      onClick={handleDeployCurrentPanel}
                      disabled={deployingPanelId === panelDraft.id || !panelDraft.channel_id}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-md shadow-indigo-600/30 transition-all disabled:opacity-50"
                    >
                      <Send className="w-4 h-4" />
                      <span>{deployingPanelId === panelDraft.id ? "Deploying..." : "Post to Channel"}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Col: Live Discord Preview */}
              <div className="space-y-4">
                <div className="sticky top-6 space-y-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                    <span>Live Discord Preview</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#1e1f22] border border-white/10 shadow-2xl space-y-3 font-sans">
                    {/* Simulated Embed */}
                    <div
                      className="p-4 rounded-lg bg-[#2b2d31] space-y-2.5 border-l-4"
                      style={{ borderLeftColor: panelDraft.color || "#6366F1" }}
                    >
                      <h3 className="text-base font-bold text-white leading-tight">
                        {panelDraft.title || "🎫 Support Tickets"}
                      </h3>
                      <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                        {panelDraft.description || "Need assistance? Select a department below."}
                      </p>
                    </div>

                    {/* Simulated Component */}
                    {panelDraft.enable_reason_categories ? (
                      <div className="p-3 rounded-lg bg-[#2b2d31] border border-white/10 flex items-center justify-between text-sm text-slate-300">
                        <span>{panelDraft.select_placeholder || "Select a department or reason..."}</span>
                        <span className="text-slate-500 text-xs">▼</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-md bg-[#5865f2] text-white text-sm font-semibold shadow-md">
                        <span>{panelDraft.button_emoji || "📩"}</span>
                        <span>{panelDraft.button_text || "Open Ticket"}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-white/5 space-y-3">
              <TicketIcon className="w-10 h-10 text-slate-600 mx-auto" />
              <h3 className="text-base font-bold text-white">No panels configured</h3>
              <p className="text-sm text-slate-400 max-w-sm mx-auto">
                Create your first ticket panel to deploy a support box with reason categories in your Discord server.
              </p>
              <button
                onClick={handleAddNewPanel}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-md transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Create First Panel</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: GENERAL & ROUTING RULES */}
      {activeTab === "settings" && (
        <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-6 bg-slate-900/60 max-w-3xl">
          <div className="flex items-center gap-3 border-b border-white/5 pb-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Shield className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide">Global Ticket Routing & Safeguards</h2>
              <p className="text-sm text-slate-400">Default categories, support staff roles, and transcript logs.</p>
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-1.5">
                Archived Transcripts Channel
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

            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-1.5">
                Default Ticket Category (Discord Category)
              </label>
              <p className="text-sm text-slate-400 mb-2">
                The Discord channel category where newly created ticket channels are placed by default.
              </p>
              <select
                value={config.category_id || ""}
                onChange={(e) => updateConfigField("category_id", e.target.value)}
                className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="">None (Spawn in server root)</option>
                {categoryChannels.map((cat: any) => (
                  <option key={cat.id} value={cat.id}>
                    📁 {cat.name}
                  </option>
                ))}
              </select>
            </div>

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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-slate-950/50 border border-white/5 space-y-1.5">
                <span className="text-sm font-semibold text-white block">Max Open Tickets Per User</span>
                <span className="text-xs text-slate-400 block mb-2">
                  Prevents users from spamming multiple open tickets simultaneously.
                </span>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={config.max_tickets_per_user}
                  onChange={(e) => updateConfigField("max_tickets_per_user", Number(e.target.value))}
                  className="w-24 bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-sm text-white font-mono focus:outline-none"
                />
              </div>

              <div className="p-4 rounded-xl bg-slate-950/50 border border-white/5 space-y-1.5">
                <span className="text-sm font-semibold text-white block">Total Resolved Tickets</span>
                <span className="text-xs text-slate-400 block mb-2">
                  Sequential counter used for ticket numbering.
                </span>
                <span className="text-xl font-mono font-bold text-indigo-400">
                  #{config.ticket_counter || 0}
                </span>
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

      {/* TAB 3: TICKET ARCHIVE */}
      {activeTab === "stream" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900/60 border border-white/5">
              {["all", "open", "claimed", "closed"].map((st) => (
                <button
                  key={st}
                  onClick={() => {
                    setTicketFilter(st);
                    fetchTickets(st);
                  }}
                  className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold capitalize transition-all ${
                    ticketFilter === st
                      ? "bg-indigo-600 text-white"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {ticketsData.tickets.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-white/5 space-y-2">
              <TicketIcon className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-sm text-slate-400">No tickets found matching the selected filter.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {ticketsData.tickets.map((t: any) => (
                <div
                  key={t.id}
                  className="p-4 rounded-xl bg-slate-900/60 border border-white/5 flex items-center justify-between gap-4 flex-wrap hover:border-white/10 transition-all"
                >
                  <div className="flex items-center gap-3.5">
                    <span className="px-3 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 font-mono text-sm font-bold text-indigo-400">
                      #{t.ticket_number}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white">{t.category_name || "General Support"}</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            t.status === "open"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : t.status === "claimed"
                              ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                              : "bg-slate-500/10 text-slate-400 border border-slate-500/20"
                          }`}
                        >
                          {t.status}
                        </span>
                      </div>
                      <span className="text-xs text-slate-400">
                        Opened by <strong className="text-slate-300">{t.user_tag}</strong> • {new Date(t.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-slate-400">
                    {t.reason && (
                      <span className="max-w-xs truncate text-xs text-slate-400 italic">
                        "{t.reason}"
                      </span>
                    )}
                    {t.claimed_by_tag && (
                      <span className="flex items-center gap-1.5 text-xs text-indigo-300">
                        <UserCheck className="w-4 h-4" />
                        <span>{t.claimed_by_tag}</span>
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
