import React, { useState } from "react";
import { useParams } from "react-router-dom";
import {
  MessageSquareHeart,
  Shield,
  Eye,
  CheckCircle,
  XCircle,
  Hash,
  Send,
  Sliders,
  Filter,
  Sparkles,
  AlertTriangle,
  Lock,
  Layers,
  Clock,
  Check,
  RefreshCw,
} from "lucide-react";
import { useConfessions } from "../../hooks/confessions/useConfessions";
import { useUnsavedChanges } from "../../hooks/useUnsavedChanges";
import { PageHeader, PageSkeleton, PageError, Switch } from "../../components/ui";
import { ChannelSelector, RoleSelector } from "../../components/discord";

export default function ConfessionsPage({ showToast }) {
  const { guildId } = useParams();
  const [testText, setTestText] = useState("");

  const {
    config,
    channels,
    roles,
    loading,
    saving,
    sendingPanel,
    hasChanges,
    testingFilter,
    filterTestResult,
    error,
    updateConfig,
    save,
    discardChanges,
    testFilter,
    sendPanel,
    refresh,
  } = useConfessions(guildId, showToast);

  useUnsavedChanges({
    isDirty: hasChanges,
    onSave: save,
    onReset: discardChanges,
    pageTitle: "Anonymous Confessions",
  });

  if (loading) {
    return <PageSkeleton cards={3} rows={0} />;
  }

  if (error) {
    return <PageError title="Failed to load confessions" description={error} onRetry={refresh} />;
  }

  const handleTestFilter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!testText.trim()) return;
    testFilter(testText);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Page Header */}
      <PageHeader
        category="ENGAGEMENT & CONTENT"
        title="Anonymous Confessions"
        description="Configure anonymous confession routing, staff approval queue, reviewer roles, and automated word filters."
        hasModuleSwitch={true}
        enabled={config.enabled}
        onToggle={(val) => updateConfig("enabled", val)}
        switchLabel="Confession System"
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={sendPanel}
              disabled={sendingPanel || !config.channel_id}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold border border-white/10 transition-all disabled:opacity-50"
              title="Post interactive submission button in the confession channel"
            >
              <Send className="w-3.5 h-3.5 text-indigo-400" />
              <span>{sendingPanel ? "Posting..." : "Deploy Submission Box"}</span>
            </button>
            <button
              type="button"
              onClick={save}
              disabled={!hasChanges || saving}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{saving ? "Saving..." : "Save Changes"}</span>
            </button>
          </div>
        }
      />

      {/* Grid of Settings Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Channel Routing */}
        <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-5 bg-slate-900/60">
          <div className="flex items-center gap-3 border-b border-white/5 pb-3">
            <div className="w-8 h-8 rounded-lg bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400">
              <Hash className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide">Channel Routing</h2>
              <p className="text-xs text-slate-400">Where confessions are reviewed and publicly broadcasted.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Public Confession Channel <span className="text-rose-400">*</span>
              </label>
              <p className="text-xs text-slate-400 mb-2">
                The channel where approved confessions are published with sequential numbers (e.g. <code>#confessions</code>).
              </p>
              <ChannelSelector
                guildId={guildId}
                channels={channels}
                value={config.channel_id}
                onChange={(val) => updateConfig("channel_id", val)}
                allowedTypes={["text"]}
                placeholder="Select public confession channel..."
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Staff Review Queue Channel
              </label>
              <p className="text-xs text-slate-400 mb-2">
                Private channel where pending confessions are delivered with interactive <code>[ Approve ]</code> and <code>[ Reject ]</code> buttons.
              </p>
              <ChannelSelector
                guildId={guildId}
                channels={channels}
                value={config.review_channel_id}
                onChange={(val) => updateConfig("review_channel_id", val)}
                allowedTypes={["text"]}
                placeholder="Select staff review channel (e.g. #confession-review)..."
              />
            </div>
          </div>
        </div>

        {/* 2. Staff Review & Access Roles */}
        <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-5 bg-slate-900/60">
          <div className="flex items-center gap-3 border-b border-white/5 pb-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide">Staff Review & Access Roles</h2>
              <p className="text-xs text-slate-400">Designate which roles can moderate, and author visibility.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Authorized Reviewer Roles
              </label>
              <p className="text-xs text-slate-400 mb-2">
                Select which staff roles can click <code>Approve</code> or <code>Reject</code> on review messages. <em>(Admins always have access)</em>
              </p>
              <RoleSelector
                roles={roles}
                multiple={true}
                value={config.reviewer_role_ids}
                onChange={(val) => updateConfig("reviewer_role_ids", val)}
                placeholder="Choose roles authorized to review..."
              />
            </div>

            <div className="pt-2 border-t border-white/5 space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/50 border border-white/5">
                <div>
                  <span className="text-xs font-semibold text-white block">Review with Username</span>
                  <span className="text-[11px] text-slate-400 block">
                    Show the confessing user's name and ID in the staff review embed so moderators know who sent it.
                  </span>
                </div>
                <Switch
                  checked={config.show_author_in_review}
                  onChange={(val) => updateConfig("show_author_in_review", val)}
                  size="sm"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/50 border border-white/5">
                <div>
                  <span className="text-xs font-semibold text-white block">Require Moderator Approval</span>
                  <span className="text-[11px] text-slate-400 block">
                    If disabled, confessions post instantly to the public channel without review.
                  </span>
                </div>
                <Switch
                  checked={config.require_approval}
                  onChange={(val) => updateConfig("require_approval", val)}
                  size="sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 3. Community Experience & Controls */}
        <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-5 bg-slate-900/60">
          <div className="flex items-center gap-3 border-b border-white/5 pb-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide">Community Experience</h2>
              <p className="text-xs text-slate-400">Cooldowns, auto-threads, and member options.</p>
            </div>
          </div>

          <div className="space-y-3.5">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/50 border border-white/5">
              <div>
                <span className="text-xs font-semibold text-white block">Auto-Thread Discussions</span>
                <span className="text-[11px] text-slate-400 block">
                  Automatically create a dedicated discussion thread under each public confession.
                </span>
              </div>
              <Switch
                checked={config.auto_thread}
                onChange={(val) => updateConfig("auto_thread", val)}
                size="sm"
              />
            </div>



            <div className="p-3 rounded-xl bg-slate-950/50 border border-white/5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  Submission Cooldown (Seconds)
                </span>
                <span className="text-xs font-mono font-bold text-indigo-400">
                  {config.cooldown_seconds}s
                </span>
              </div>
              <input
                type="number"
                min={0}
                max={3600}
                value={config.cooldown_seconds}
                onChange={(e) => updateConfig("cooldown_seconds", Number(e.target.value))}
                className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                placeholder="60"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Prevents spam by requiring users to wait between confession submissions.
              </span>
            </div>
          </div>
        </div>

        {/* 4. Regex & Blacklisted Word Filter */}
        <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-5 bg-slate-900/60">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Filter className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white tracking-wide">Word & Regex Filter Mode</h2>
                <p className="text-xs text-slate-400">Block prohibited words, doxxing, or custom regex patterns.</p>
              </div>
            </div>
            <Switch
              checked={config.regex_filter_enabled}
              onChange={(val) => updateConfig("regex_filter_enabled", val)}
              size="sm"
            />
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Blacklisted Words & Phrases
              </label>
              <textarea
                rows={3}
                value={config.banned_words || ""}
                onChange={(e) => updateConfig("banned_words", e.target.value)}
                placeholder="Enter words or phrases separated by commas or newlines..."
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Custom Regex Pattern (Optional)
              </label>
              <input
                type="text"
                value={config.regex_filter || ""}
                onChange={(e) => updateConfig("regex_filter", e.target.value)}
                placeholder="e.g. (discord\.gg|https?:\/\/)"
                className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-white/10 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>

            {/* Live Filter Testing Sandbox */}
            <div className="p-3 rounded-xl bg-slate-950/80 border border-white/10 space-y-2">
              <span className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                Live Filter Test Sandbox
              </span>
              <form onSubmit={handleTestFilter} className="flex gap-2">
                <input
                  type="text"
                  value={testText}
                  onChange={(e) => setTestText(e.target.value)}
                  placeholder="Type a sample sentence to test..."
                  className="flex-1 px-2.5 py-1 rounded-lg bg-slate-900 border border-white/10 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="submit"
                  disabled={testingFilter || !testText.trim()}
                  className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
                >
                  {testingFilter ? "Testing..." : "Test"}
                </button>
              </form>

              {filterTestResult && (
                <div
                  className={`p-2 rounded-lg text-xs flex items-center gap-2 ${
                    filterTestResult.flagged
                      ? "bg-rose-500/10 text-rose-300 border border-rose-500/20"
                      : "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                  }`}
                >
                  {filterTestResult.flagged ? (
                    <>
                      <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      <span>
                        <strong>Blocked!</strong> {filterTestResult.reason}
                      </span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span><strong>Clean!</strong> This text passed through the filter safely.</span>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
