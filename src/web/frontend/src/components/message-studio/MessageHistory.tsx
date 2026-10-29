import React, { useState, useMemo } from "react";
import {
  History,
  CheckCircle2,
  AlertCircle,
  Edit3,
  Trash2,
  Copy,
  Check,
  RotateCcw,
  Search,
  ExternalLink,
  MessageSquare,
  Layers,
  Sparkles,
  Paperclip,
  CornerUpLeft,
  X,
  AlertTriangle,
  Info,
} from "lucide-react";
import ConfirmDialog from "../ui/ConfirmDialog";

/**
 * Dedicated Modal for Deleting Messages and Managing History Records
 */
function DeleteMessageModal({
  isOpen,
  onClose,
  item,
  channelName,
  onConfirmDeleteLive,
  onConfirmRemoveHistory,
}) {
  const [removeFromHistory, setRemoveFromHistory] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen || !item) return null;

  const isLiveMessage = Boolean(item.message_id && item.status !== "deleted");
  const payload = item.payload || {};
  const snippet =
    payload.content ||
    payload.embeds?.[0]?.title ||
    payload.embeds?.[0]?.description ||
    "Empty message payload";

  const handleDeleteLive = async () => {
    setLoading(true);
    setError(null);
    try {
      await onConfirmDeleteLive(item.message_id, item.channel_id, {
        historyId: item.id,
        removeFromHistory,
      });
      onClose();
    } catch (err) {
      setError(
        err?.message ||
          "Failed to delete message from Discord. Check bot permissions (Manage Messages)."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveHistoryOnly = async () => {
    setLoading(true);
    setError(null);
    try {
      await onConfirmRemoveHistory(item.id);
      onClose();
    } catch (err) {
      setError(err?.message || "Failed to remove history record.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg p-6 rounded-3xl bg-slate-900 border border-white/10 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {isLiveMessage ? "Delete Discord Message" : "Remove History Record"}
              </h3>
              <p className="text-xs text-slate-400">
                {isLiveMessage
                  ? `Permanently remove live message from #${channelName}`
                  : `Prune record from dashboard audit log`}
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Message Context Card */}
        <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-white/5 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold text-white">#{channelName}</span>
            {item.message_id && (
              <span className="font-mono text-[11px] text-slate-500">
                ID: {String(item.message_id)}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-300 font-mono italic line-clamp-3 pl-3 border-l-2 border-indigo-500/40">
            "{snippet.length > 180 ? snippet.slice(0, 180) + "..." : snippet}"
          </p>
        </div>

        {/* Live Message Specific Controls */}
        {isLiveMessage ? (
          <div className="space-y-3">
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                The bot will delete this message directly from Discord. Members in{" "}
                <strong>#{channelName}</strong> will no longer see it.
              </span>
            </div>

            {/* Checkbox: Also remove from history log */}
            <label className="flex items-center gap-2.5 p-3 rounded-2xl bg-slate-950/60 border border-white/5 cursor-pointer hover:bg-slate-950 transition-colors">
              <input
                type="checkbox"
                checked={removeFromHistory}
                onChange={(e) => setRemoveFromHistory(e.target.checked)}
                className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-white/20 bg-slate-900"
              />
              <div className="text-xs">
                <span className="font-semibold text-white block">
                  Also remove from History log
                </span>
                <span className="text-[11px] text-slate-400 block">
                  {removeFromHistory
                    ? "Entry will be completely deleted from the audit table."
                    : "Entry will remain in history marked with status 'Deleted'."}
                </span>
              </div>
            </label>
          </div>
        ) : (
          <div className="p-3 rounded-2xl bg-slate-800/60 border border-white/5 text-slate-300 text-xs flex items-start gap-2">
            <Info className="w-4 h-4 shrink-0 mt-0.5 text-slate-400" />
            <span>
              This message is already marked as{" "}
              <strong className="uppercase font-mono text-white">{item.status}</strong>. Removing it
              will clear it from your dashboard history audit log.
            </span>
          </div>
        )}

        {/* Error Notice */}
        {error && (
          <div className="space-y-2">
            <div className="p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold">Deletion Failed</p>
                <p className="text-[11px] leading-relaxed">{error}</p>
              </div>
            </div>

            {/* Fallback button if message was already removed in Discord */}
            {isLiveMessage && (
              <button
                type="button"
                onClick={handleRemoveHistoryOnly}
                className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
              >
                <span>Message may already be deleted from Discord. Remove record from History anyway</span>
              </button>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>

          {isLiveMessage ? (
            <button
              type="button"
              disabled={loading}
              onClick={handleDeleteLive}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/30 transition-all disabled:opacity-40"
            >
              {loading ? (
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Trash2 className="w-3.5 h-3.5" />
              )}
              <span>{loading ? "Deleting..." : "Delete from Discord"}</span>
            </button>
          ) : (
            <button
              type="button"
              disabled={loading}
              onClick={handleRemoveHistoryOnly}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/30 transition-all disabled:opacity-40"
            >
              {loading ? (
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Trash2 className="w-3.5 h-3.5" />
              )}
              <span>{loading ? "Removing..." : "Remove from History"}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MessageHistory({
  history = [],
  onLoadPayload,
  onOpenEditModal,
  onDeleteMessage,
  onDeleteHistoryEntry,
  onClearHistory,
  channels = [],
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeDeleteTarget, setActiveDeleteTarget] = useState(null);
  const [isClearAllModalOpen, setIsClearAllModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  const getChannelName = (channelId) => {
    const ch = channels.find((c) => c.id === channelId);
    return ch ? ch.name : channelId || "unknown-channel";
  };

  const handleCopyId = (e, messageId) => {
    e.stopPropagation();
    if (!messageId) return;
    navigator.clipboard?.writeText(String(messageId));
    setCopiedId(messageId);
    setTimeout(() => setCopiedId(null), 1500);
  };

  // Status Counts
  const counts = useMemo(() => {
    const res = { all: history.length, delivered: 0, edited: 0, failed: 0, deleted: 0 };
    history.forEach((item) => {
      if (res[item.status] !== undefined) {
        res[item.status]++;
      } else {
        res.delivered++;
      }
    });
    return res;
  }, [history]);

  // Filtered Items
  const filteredHistory = useMemo(() => {
    const q = search.trim().toLowerCase();
    return history.filter((item) => {
      if (statusFilter !== "all" && item.status !== statusFilter) {
        return false;
      }
      if (!q) return true;
      const channelName = getChannelName(item.channel_id).toLowerCase();
      const messageId = String(item.message_id || "").toLowerCase();
      const content = String(item.payload?.content || "").toLowerCase();
      const embedTitle = String(item.payload?.embeds?.[0]?.title || "").toLowerCase();
      const embedDesc = String(item.payload?.embeds?.[0]?.description || "").toLowerCase();

      return (
        channelName.includes(q) ||
        messageId.includes(q) ||
        content.includes(q) ||
        embedTitle.includes(q) ||
        embedDesc.includes(q)
      );
    });
  }, [history, search, statusFilter, channels]);

  const formatTimestamp = (dateString) => {
    if (!dateString) return "Recently";
    try {
      const d = new Date(dateString);
      return d.toLocaleString([], {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "Recently";
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "delivered":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3" />
            Delivered
          </span>
        );
      case "edited":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-sky-500/15 text-sky-400 text-[10px] font-bold border border-sky-500/30">
            <Edit3 className="w-3 h-3" />
            Edited
          </span>
        );
      case "deleted":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px] font-bold border border-white/5">
            <Trash2 className="w-3 h-3" />
            Deleted
          </span>
        );
      case "failed":
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/15 text-rose-400 text-[10px] font-bold border border-rose-500/30">
            <AlertCircle className="w-3 h-3" />
            Failed
          </span>
        );
    }
  };

  // Prune deleted & failed
  const handlePruneDeadLogs = async () => {
    if (onClearHistory) {
      await onClearHistory("deleted");
      await onClearHistory("failed");
    }
  };

  const prunableCount = counts.deleted + counts.failed;

  return (
    <div className="space-y-4">
      {/* Header with Title, Actions & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
            <History className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">Message History</h3>
            <p className="text-[11px] text-slate-400">
              Audit log of messages delivered, edited, or deleted through Message Studio
            </p>
          </div>
        </div>

        {/* Right Header Tools */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Prune / Clear buttons */}
          {prunableCount > 0 && onClearHistory && (
            <button
              type="button"
              onClick={handlePruneDeadLogs}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs font-semibold transition-colors border border-white/5 shrink-0"
              title="Remove all already-deleted and failed records from the history log"
            >
              <Trash2 className="w-3.5 h-3.5 text-slate-400" />
              <span>Prune Inactive ({prunableCount})</span>
            </button>
          )}

          {history.length > 0 && onClearHistory && (
            <button
              type="button"
              onClick={() => setIsClearAllModalOpen(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 text-xs font-semibold transition-colors border border-white/5 shrink-0"
              title="Clear all message history"
            >
              <span>Clear All</span>
            </button>
          )}

          {/* Search input */}
          <div className="relative w-full sm:w-60">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search content, channel, ID..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-900 border border-white/10 text-white text-xs placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {[
          { id: "all", label: "All Messages", count: counts.all },
          { id: "delivered", label: "Delivered", count: counts.delivered },
          { id: "edited", label: "Edited", count: counts.edited },
          { id: "failed", label: "Failed", count: counts.failed },
          { id: "deleted", label: "Deleted", count: counts.deleted },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setStatusFilter(tab.id)}
            className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all shrink-0 flex items-center gap-1.5 ${
              statusFilter === tab.id
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "bg-slate-900/80 text-slate-400 hover:text-white border border-white/5"
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono ${
                statusFilter === tab.id ? "bg-white/20 text-white" : "bg-slate-800 text-slate-400"
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* History List */}
      {filteredHistory.length === 0 ? (
        <div className="p-8 rounded-2xl bg-slate-900/40 border border-white/5 text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-slate-800/80 text-slate-500 flex items-center justify-center mx-auto">
            <History className="w-6 h-6" />
          </div>
          <p className="text-xs font-medium text-slate-300">
            {history.length === 0
              ? "No messages published yet."
              : "No messages match your search or filter."}
          </p>
          <p className="text-[11px] text-slate-500">
            {history.length === 0
              ? "Messages sent to your Discord server from the Studio will be recorded here with delivery receipts."
              : "Try adjusting your search terms or selecting another status filter."}
          </p>
          {statusFilter !== "all" && (
            <button
              type="button"
              onClick={() => {
                setStatusFilter("all");
                setSearch("");
              }}
              className="mt-2 text-xs font-semibold text-indigo-400 hover:text-indigo-300 underline"
            >
              Reset filter
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3 max-h-[540px] overflow-y-auto pr-1">
          {filteredHistory.map((item) => {
            const hasLiveMessage = Boolean(item.message_id && item.status !== "deleted");
            const payload = item.payload || {};
            const embeds = Array.isArray(payload.embeds) ? payload.embeds : [];
            const firstEmbed = embeds[0];
            const hasEmbed = embeds.length > 0;
            const content = payload.content || "";
            const attachments = Array.isArray(payload.attachments) ? payload.attachments : [];
            const hasReply = Boolean(payload.reply_config?.message_url || payload.reply_config?.message_id);

            const modeBadge = hasEmbed && content ? "HYBRID" : hasEmbed ? "EMBED" : "NORMAL";

            return (
              <div
                key={item.id}
                className="p-4 rounded-2xl bg-slate-900/70 border border-white/5 hover:border-white/10 transition-all space-y-3 group"
              >
                {/* Top Row: Status, Channel, Date */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {getStatusBadge(item.status)}
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 font-mono text-xs font-semibold border border-white/5">
                      #{getChannelName(item.channel_id)}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 text-[10px] font-mono font-bold uppercase border border-indigo-500/20">
                      {modeBadge}
                    </span>
                    {hasReply && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800 text-amber-400 text-[10px] font-mono border border-white/5">
                        <CornerUpLeft className="w-3 h-3" />
                        Reply
                      </span>
                    )}
                    {attachments.length > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 text-[10px] font-mono border border-white/5">
                        <Paperclip className="w-3 h-3" />
                        {attachments.length} files
                      </span>
                    )}
                  </div>

                  <span className="text-[11px] text-slate-400 font-mono">
                    {formatTimestamp(item.created_at)}
                  </span>
                </div>

                {/* Content / Embed Snippet Box */}
                <div className="p-3 rounded-xl bg-slate-950/80 border border-white/5 space-y-2">
                  {content && (
                    <div className="text-xs text-slate-300 font-mono whitespace-pre-wrap line-clamp-3 leading-relaxed">
                      {content}
                    </div>
                  )}

                  {hasEmbed && (
                    <div
                      className="pl-3 py-1 border-l-2 rounded-r-lg bg-slate-900/60"
                      style={{ borderColor: firstEmbed?.color || "#5865F2" }}
                    >
                      {firstEmbed?.title && (
                        <p className="text-xs font-bold text-white truncate mb-0.5">
                          {firstEmbed.title}
                        </p>
                      )}
                      {firstEmbed?.description && (
                        <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                          {firstEmbed.description}
                        </p>
                      )}
                      {embeds.length > 1 && (
                        <p className="text-[10px] text-indigo-400 font-mono mt-1">
                          + {embeds.length - 1} more embed{embeds.length > 2 ? "s" : ""}
                        </p>
                      )}
                    </div>
                  )}

                  {!content && !hasEmbed && (
                    <p className="text-xs text-slate-500 italic">Empty payload preview</p>
                  )}
                </div>

                {/* Error Banner (if any) */}
                {item.error_message && (
                  <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{item.error_message}</span>
                  </div>
                )}

                {/* Bottom Actions Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/5 text-xs">
                  {/* Message ID badge with copy */}
                  <div className="flex items-center gap-1.5">
                    {item.message_id ? (
                      <button
                        type="button"
                        onClick={(e) => handleCopyId(e, item.message_id)}
                        className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors font-mono text-[11px] border border-white/5"
                        title="Click to copy Discord Message ID"
                      >
                        {copiedId === item.message_id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3 text-slate-500" />
                            <span>ID: {String(item.message_id).slice(-8)}</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <span className="text-[11px] text-slate-600 font-mono">No Discord ID</span>
                    )}
                  </div>

                  {/* Operational Actions */}
                  <div className="flex items-center gap-2">
                    {/* Load into Editor */}
                    <button
                      type="button"
                      onClick={() =>
                        onLoadPayload({
                          ...(item.payload || {}),
                          channel_id: item.channel_id,
                        })
                      }
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-600/15 hover:bg-indigo-600/30 text-indigo-400 hover:text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition-all shadow-sm"
                      title="Load this message configuration into the Message Composer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Load to Editor</span>
                    </button>

                    {/* Edit Live Message in Discord */}
                    {hasLiveMessage && (
                      <button
                        type="button"
                        onClick={() => onOpenEditModal(item)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 hover:text-sky-300 border border-sky-500/20 text-xs font-semibold transition-all"
                        title="Edit live message in Discord directly"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit Live</span>
                      </button>
                    )}

                    {/* Delete Actions: Delete from Discord (if live) or Remove from History */}
                    {hasLiveMessage ? (
                      <button
                        type="button"
                        onClick={() => setActiveDeleteTarget(item)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/20 text-xs font-semibold transition-all"
                        title="Delete this message from the Discord channel"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Live</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setActiveDeleteTarget(item)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 border border-white/5 hover:border-rose-500/20 text-xs font-semibold transition-all"
                        title="Remove record from History log"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove Log</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Dedicated Delete Message Modal */}
      <DeleteMessageModal
        isOpen={Boolean(activeDeleteTarget)}
        onClose={() => setActiveDeleteTarget(null)}
        item={activeDeleteTarget}
        channelName={getChannelName(activeDeleteTarget?.channel_id)}
        onConfirmDeleteLive={onDeleteMessage}
        onConfirmRemoveHistory={onDeleteHistoryEntry}
      />

      {/* Confirmation Dialog for Clearing All History */}
      <ConfirmDialog
        isOpen={isClearAllModalOpen}
        onClose={() => setIsClearAllModalOpen(false)}
        onConfirm={async () => {
          if (onClearHistory) await onClearHistory();
          setIsClearAllModalOpen(false);
        }}
        title="Clear All Message History"
        description="Are you sure you want to clear all message history records? This only deletes the history logs in this dashboard; live messages in Discord channels will NOT be deleted."
        confirmText="Clear All History"
        danger={true}
      />
    </div>
  );
}
