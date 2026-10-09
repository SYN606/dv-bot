import React, { useState, useEffect, useRef } from "react";
import {
  Send,
  Save,
  Bookmark,
  FilePlus,
  PenTool,
  Eye,
  Layers,
  MessageSquare,
  Sparkles,
  Check,
  AlertCircle,
  Hash,
  History,
  FileEdit,
  CornerUpLeft,
  ArrowRight,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import ChannelSelector from "../discord/ChannelSelector";
import NormalMessageEditor from "./NormalMessageEditor";
import EmbedEditor from "./EmbedEditor";
import ReplyMessageSelector from "./ReplyMessageSelector";
import DiscordMessagePreview from "./DiscordMessagePreview";
import MessageDraftLibrary from "./MessageDraftLibrary";
import MessageTemplateLibrary from "./MessageTemplateLibrary";
import MessageHistory from "./MessageHistory";
import PublishDialog from "./PublishDialog";
import SaveTemplateModal from "./SaveTemplateModal";
import EditPublishedModal from "./EditPublishedModal";
import MessageValidationSummary from "./MessageValidationSummary";

const DEFAULT_EMBED = {
  color: "#5865F2",
  author: { name: "", url: "", icon_url: "" },
  title: "",
  url: "",
  description: "",
  fields: [],
  thumbnail: { url: "" },
  image: { url: "" },
  footer: { text: "", icon_url: "" },
  timestamp: false,
};

export default function MessageComposer({
  guildId,
  botInfo,
  channels = [],
  drafts = [],
  templates = [],
  history = [],
  onSaveDraft,
  onDeleteDraft,
  onCreateTemplate,
  onUpdateTemplate,
  onDuplicateTemplate,
  onDeleteTemplate,
  onPublishMessage,
  onEditPublishedMessage,
  onDeletePublishedMessage,
  onDeleteHistoryEntry,
  onClearHistory,
  showToast,
}) {
  // Navigation View Tab: "editor" | "history" | "templates" | "drafts"
  const [activeTab, setActiveTab] = useState("editor");

  // Mobile Sub-view in Editor tab: "composer" | "preview"
  const [mobileEditorView, setMobileEditorView] = useState("composer");

  // Main Message State
  const [currentDraftId, setCurrentDraftId] = useState(null);
  const [revision, setRevision] = useState(1);
  const [messageName, setMessageName] = useState("Untitled Message");
  const [mode, setMode] = useState("normal"); // "normal" | "embed" | "hybrid"
  const [content, setContent] = useState("");
  const [embeds, setEmbeds] = useState([DEFAULT_EMBED]);
  const [attachments, setAttachments] = useState([]);
  const [channelId, setChannelId] = useState(channels[0]?.id || "");
  const [showReplyBox, setShowReplyBox] = useState(false);
  const [replyConfig, setReplyConfig] = useState({
    enabled: false,
    message_url: "",
    channel_id: null,
    message_id: null,
    mention_user: false,
    preview: null,
  });

  // UI & Validation States
  const [saveStatus, setSaveStatus] = useState("saved"); // "saved" | "unsaved" | "saving"
  const [validationErrors, setValidationErrors] = useState([]);

  // Modals
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [isSaveTemplateModalOpen, setIsSaveTemplateModalOpen] = useState(false);
  const [editingHistoryItem, setEditingHistoryItem] = useState(null);

  // Set default channel when channels load
  useEffect(() => {
    if (!channelId && channels.length > 0) {
      setChannelId(channels[0].id);
    }
  }, [channels, channelId]);

  // Keep reply box open if reply is enabled
  useEffect(() => {
    if (replyConfig.enabled) {
      setShowReplyBox(true);
    }
  }, [replyConfig.enabled]);

  // Mark unsaved on edits
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    setSaveStatus("unsaved");
    validateCurrentState();
  }, [content, embeds, attachments, mode, messageName, channelId, replyConfig]);

  // Debounced Autosave for current active draft
  useEffect(() => {
    if (!currentDraftId || saveStatus !== "unsaved") return;

    const timer = setTimeout(async () => {
      setSaveStatus("saving");
      try {
        const payload = getCurrentPayload();
        payload.id = currentDraftId;
        payload.expectedRevision = revision;
        const res = await onSaveDraft(payload);
        const savedDraft = res?.draft || res;
        if (res?.conflict) {
          showToast?.("Conflict: Draft was updated in another window.", "warning");
        } else if (savedDraft?.id) {
          setRevision(savedDraft.revision || revision + 1);
          setSaveStatus("saved");
        }
      } catch {
        setSaveStatus("unsaved");
      }
    }, 4000);

    return () => clearTimeout(timer);
  }, [saveStatus, currentDraftId, content, embeds, attachments, mode, messageName, channelId, replyConfig]);

  const getCurrentPayload = () => ({
    name: messageName,
    mode,
    content,
    embeds,
    attachments,
    channel_id: channelId,
    reply_config: replyConfig,
  });

  const validateCurrentState = () => {
    const errors = [];
    if (!channelId) {
      errors.push("Please select a target destination channel.");
    }
    if (mode === "normal" && !content.trim() && attachments.length === 0) {
      errors.push("Normal mode requires text content or file attachments.");
    }
    if (content.length > 2000) {
      errors.push(`Content exceeds 2,000 characters (${content.length}/2,000).`);
    }
    if (mode === "embed") {
      const hasAny = embeds.some(
        (e) =>
          e.title?.trim() ||
          e.description?.trim() ||
          e.image?.url?.trim() ||
          e.thumbnail?.url?.trim() ||
          (Array.isArray(e.fields) && e.fields.length > 0) ||
          e.author?.name?.trim() ||
          e.footer?.text?.trim()
      );
      if (!hasAny) {
        errors.push("Embed mode requires at least one embed with title, description, image, or fields.");
      }
    }
    if (mode === "hybrid") {
      const hasContent = content.trim().length > 0 || attachments.length > 0;
      const hasAnyEmbed = embeds.some(
        (e) =>
          e.title?.trim() ||
          e.description?.trim() ||
          e.image?.url?.trim() ||
          e.thumbnail?.url?.trim() ||
          (Array.isArray(e.fields) && e.fields.length > 0) ||
          e.author?.name?.trim() ||
          e.footer?.text?.trim()
      );
      if (!hasContent && !hasAnyEmbed) {
        errors.push("Hybrid mode requires text content or at least one configured embed.");
      }
    }
    if (mode !== "normal") {
      let totalChars = 0;
      embeds.forEach((e, idx) => {
        const c =
          (e.title || "").length +
          (e.description || "").length +
          (e.author?.name || "").length +
          (e.footer?.text || "").length +
          (e.fields || []).reduce((acc, f) => acc + (f.name || "").length + (f.value || "").length, 0);
        totalChars += c;
        if ((e.fields || []).length > 25) {
          errors.push(`Embed #${idx + 1} has more than 25 fields.`);
        }
      });
      if (totalChars > 6000) {
        errors.push(`Total embed characters (${totalChars}) exceed Discord's 6,000 limit.`);
      }
    }
    setValidationErrors(errors);
    return errors.length === 0;
  };

  // Reset to new blank message
  const handleNewMessage = () => {
    setCurrentDraftId(null);
    setRevision(1);
    setMessageName("Untitled Message");
    setMode("normal");
    setContent("");
    setEmbeds([DEFAULT_EMBED]);
    setAttachments([]);
    setReplyConfig({
      enabled: false,
      message_url: "",
      channel_id: null,
      message_id: null,
      mention_user: false,
      preview: null,
    });
    setShowReplyBox(false);
    setSaveStatus("saved");
    setActiveTab("editor");
    showToast?.("Created fresh message canvas.", "info");
  };

  // Load a Draft
  const handleLoadDraft = (draft) => {
    setCurrentDraftId(draft.id);
    setRevision(draft.revision || 1);
    setMessageName(draft.name || "Untitled Message");
    setMode(draft.mode || "normal");
    setContent(draft.content || "");
    setEmbeds(Array.isArray(draft.embeds) && draft.embeds.length > 0 ? draft.embeds : [DEFAULT_EMBED]);
    setAttachments(Array.isArray(draft.attachments) ? draft.attachments : []);
    if (draft.channel_id) setChannelId(draft.channel_id);
    if (draft.reply_config) {
      setReplyConfig(draft.reply_config);
      if (draft.reply_config.enabled) setShowReplyBox(true);
    }
    setSaveStatus("saved");
    setActiveTab("editor");
    showToast?.(`Loaded draft "${draft.name}".`, "success");
  };

  // Load a Template
  const handleLoadTemplate = (tpl) => {
    setMessageName(tpl.name || "New Message");
    setMode(tpl.mode || "normal");
    setContent(tpl.content || "");
    setEmbeds(Array.isArray(tpl.embeds) && tpl.embeds.length > 0 ? tpl.embeds : [DEFAULT_EMBED]);
    setAttachments(Array.isArray(tpl.attachments) ? tpl.attachments : []);
    setSaveStatus("unsaved");
    setActiveTab("editor");
    showToast?.(`Loaded template "${tpl.name}".`, "success");
  };

  // Load arbitrary payload back into editor (e.g. from history)
  const handleLoadPayload = (payload) => {
    if (!payload) return;
    if (payload.name) setMessageName(payload.name);
    if (payload.mode) setMode(payload.mode);
    if (payload.content !== undefined) setContent(payload.content);
    if (Array.isArray(payload.embeds)) setEmbeds(payload.embeds.length > 0 ? payload.embeds : [DEFAULT_EMBED]);
    if (Array.isArray(payload.attachments)) setAttachments(payload.attachments);
    if (payload.reply_config) {
      setReplyConfig(payload.reply_config);
      if (payload.reply_config.enabled) setShowReplyBox(true);
    }
    if (payload.channel_id) setChannelId(payload.channel_id);
    setSaveStatus("unsaved");
    setActiveTab("editor");
    showToast?.("Restored message into Message Editor.", "info");
  };

  // Explicit Save Draft action
  const handleManualSaveDraft = async () => {
    setSaveStatus("saving");
    try {
      const payload = getCurrentPayload();
      if (currentDraftId) {
        payload.id = currentDraftId;
        payload.expectedRevision = revision;
      }
      const res = await onSaveDraft(payload);
      const savedDraft = res?.draft || res;
      if (res?.conflict) {
        showToast?.("Conflict: Draft was updated in another session.", "error");
      } else if (savedDraft?.id) {
        setCurrentDraftId(savedDraft.id);
        setRevision(savedDraft.revision || revision + 1);
        setSaveStatus("saved");
        showToast?.("Draft saved successfully.", "success");
      }
    } catch (err) {
      setSaveStatus("unsaved");
      showToast?.(err?.message || "Failed to save draft.", "error");
    }
  };

  // Save as Template action
  const handleSaveAsTemplate = async (templateMeta) => {
    const payload = {
      ...getCurrentPayload(),
      name: templateMeta.name,
      description: templateMeta.description || "",
      category: templateMeta.category || "General",
    };
    await onCreateTemplate(payload);
    showToast?.(`Saved template "${templateMeta.name}".`, "success");
  };

  // Publish to Discord action
  const handleConfirmPublish = async (publishPayload) => {
    const res = await onPublishMessage({
      channel_id: channelId,
      payload: publishPayload,
      sourceType: currentDraftId ? "draft" : "direct",
      sourceId: currentDraftId,
      idempotencyKey: publishPayload.idempotencyKey,
    });
    showToast?.("Message published to Discord successfully!", "success");
    return res;
  };

  const selectedChannel = channels.find((c) => c.id === channelId);

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. Header Toolbar */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-3xl glass-panel border border-white/5 bg-slate-900/60 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600/15 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base font-extrabold text-white tracking-tight">Message Studio</h1>
              {saveStatus === "saving" && (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-[10px] font-mono border border-amber-500/20">
                  <div className="w-2 h-2 rounded-full border border-amber-400 border-t-transparent animate-spin" />
                  Saving...
                </span>
              )}
              {saveStatus === "saved" && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-mono border border-emerald-500/20">
                  <Check className="w-2.5 h-2.5" />
                  Saved
                </span>
              )}
              {saveStatus === "unsaved" && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px] font-mono border border-white/5">
                  Unsaved
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              Clean, visual Discord message builder, history & templates
            </p>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* New Canvas */}
          <button
            type="button"
            onClick={handleNewMessage}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors border border-white/5"
            title="Start fresh blank message"
          >
            <FilePlus className="w-4 h-4" />
            <span className="hidden sm:inline">New</span>
          </button>

          {/* Save Draft */}
          <button
            type="button"
            disabled={saveStatus === "saving"}
            onClick={handleManualSaveDraft}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors border border-white/5"
            title="Save draft"
          >
            <Save className="w-4 h-4 text-indigo-400" />
            <span className="hidden sm:inline">Save Draft</span>
          </button>

          {/* Save as Template */}
          <button
            type="button"
            onClick={() => setIsSaveTemplateModalOpen(true)}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors border border-white/5"
            title="Save as reusable template"
          >
            <Bookmark className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Template</span>
          </button>

          {/* Send / Publish Button */}
          <button
            type="button"
            onClick={() => {
              if (validateCurrentState()) {
                setIsPublishModalOpen(true);
              } else {
                showToast?.("Please complete all message requirements before sending.", "error");
              }
            }}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold inline-flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all"
          >
            <Send className="w-4 h-4" />
            <span>Send to Discord</span>
          </button>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. Primary Navigation Bar */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-2 p-1.5 rounded-2xl bg-slate-900/80 border border-white/5">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none w-full sm:w-auto">
          {/* Editor Tab */}
          <button
            type="button"
            onClick={() => setActiveTab("editor")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
              activeTab === "editor"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <PenTool className="w-3.5 h-3.5" />
            <span>Message Editor</span>
          </button>

          {/* History Tab */}
          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
              activeTab === "history"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Message History</span>
            <span
              className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono ${
                activeTab === "history" ? "bg-white/20 text-white" : "bg-slate-800 text-slate-400"
              }`}
            >
              {history.length}
            </span>
          </button>

          {/* Templates Tab */}
          <button
            type="button"
            onClick={() => setActiveTab("templates")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
              activeTab === "templates"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>Templates</span>
            <span
              className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono ${
                activeTab === "templates" ? "bg-white/20 text-white" : "bg-slate-800 text-slate-400"
              }`}
            >
              {templates.length}
            </span>
          </button>

          {/* Drafts Tab */}
          <button
            type="button"
            onClick={() => setActiveTab("drafts")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
              activeTab === "drafts"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <FileEdit className="w-3.5 h-3.5" />
            <span>Drafts</span>
            <span
              className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono ${
                activeTab === "drafts" ? "bg-white/20 text-white" : "bg-slate-800 text-slate-400"
              }`}
            >
              {drafts.length}
            </span>
          </button>
        </div>

        {/* Mobile toggle between composer & live preview when on editor tab */}
        {activeTab === "editor" && (
          <div className="lg:hidden flex rounded-xl bg-slate-950 p-1 border border-white/5 shrink-0">
            <button
              type="button"
              onClick={() => setMobileEditorView("composer")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                mobileEditorView === "composer"
                  ? "bg-indigo-600 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Editor
            </button>
            <button
              type="button"
              onClick={() => setMobileEditorView("preview")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                mobileEditorView === "preview"
                  ? "bg-indigo-600 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Preview
            </button>
          </div>
        )}
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 3. Main Body Views */}
      {/* ───────────────────────────────────────────────────────────── */}

      {/* VIEW: MESSAGE EDITOR */}
      {activeTab === "editor" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-0">
          {/* Left Column: Focused Composer (7 cols on lg) */}
          <div
            className={`lg:col-span-7 space-y-4 overflow-y-auto pr-1 ${
              mobileEditorView === "preview" ? "hidden lg:block" : "block"
            }`}
          >
            {/* Top Setup Card: Name, Mode & Channel */}
            <div className="p-4 rounded-3xl glass-panel bg-slate-900/70 border border-white/5 space-y-3.5">
              {/* Row 1: Message Name & Format Segment */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Message Name Input */}
                <div className="flex-1 min-w-0">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Message Title
                  </label>
                  <input
                    type="text"
                    value={messageName}
                    onChange={(e) => setMessageName(e.target.value)}
                    placeholder="e.g. Server Announcement"
                    maxLength={100}
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-white/10 text-white text-xs font-bold placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                {/* Message Format Selector */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Format Mode
                  </label>
                  <div className="inline-flex p-1 rounded-xl bg-slate-950 border border-white/5">
                    <button
                      type="button"
                      onClick={() => setMode("normal")}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        mode === "normal"
                          ? "bg-indigo-600 text-white shadow"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      Normal
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode("embed")}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        mode === "embed"
                          ? "bg-indigo-600 text-white shadow"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      Embed
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode("hybrid")}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        mode === "hybrid"
                          ? "bg-indigo-600 text-white shadow"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      Hybrid
                    </button>
                  </div>
                </div>
              </div>

              {/* Row 2: Destination Channel & Reply Toggle Button */}
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pt-2 border-t border-white/5">
                <div className="flex-1 min-w-0">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Destination Channel
                  </label>
                  <ChannelSelector
                    channels={channels}
                    value={channelId}
                    onChange={setChannelId}
                    placeholder="Select text channel..."
                  />
                </div>

                {/* Reply Toggle */}
                <div>
                  <button
                    type="button"
                    onClick={() => setShowReplyBox(!showReplyBox)}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all border ${
                      replyConfig.enabled
                        ? "bg-indigo-600/15 text-indigo-400 border-indigo-500/30"
                        : showReplyBox
                        ? "bg-slate-800 text-white border-white/10"
                        : "bg-slate-950 text-slate-400 hover:text-white border-white/5"
                    }`}
                  >
                    <CornerUpLeft className="w-3.5 h-3.5" />
                    <span>{replyConfig.enabled ? "Reply Active" : "Add Reply"}</span>
                    {showReplyBox ? (
                      <ChevronUp className="w-3 h-3 ml-0.5" />
                    ) : (
                      <ChevronDown className="w-3 h-3 ml-0.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Collapsible Reply Configuration Card */}
              {showReplyBox && (
                <div className="pt-2">
                  <ReplyMessageSelector
                    guildId={guildId}
                    replyConfig={replyConfig}
                    onChangeReplyConfig={setReplyConfig}
                    currentChannelId={channelId}
                    onSelectChannel={setChannelId}
                  />
                </div>
              )}
            </div>

            {/* Validation Errors Notice */}
            <MessageValidationSummary errors={validationErrors} />

            {/* Normal Text Message Editor */}
            {(mode === "normal" || mode === "hybrid") && (
              <div className="p-4 rounded-3xl glass-panel bg-slate-900/70 border border-white/5 space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-white/5">
                  <MessageSquare className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs font-bold text-slate-200 uppercase tracking-wide">
                    Text Content
                  </span>
                </div>
                <NormalMessageEditor
                  content={content}
                  onChangeContent={setContent}
                  attachments={attachments}
                  onChangeAttachments={setAttachments}
                />
              </div>
            )}

            {/* Embed Message Editor */}
            {(mode === "embed" || mode === "hybrid") && (
              <div className="p-4 rounded-3xl glass-panel bg-slate-900/70 border border-white/5 space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-white/5">
                  <Layers className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs font-bold text-slate-200 uppercase tracking-wide">
                    Rich Embeds ({embeds.length}/10)
                  </span>
                </div>
                <EmbedEditor embeds={embeds} onChangeEmbeds={setEmbeds} />
              </div>
            )}
          </div>

          {/* Right Column: Live Discord Client Preview (5 cols on lg, sticky) */}
          <div
            className={`lg:col-span-5 lg:sticky lg:top-4 self-start max-h-[calc(100vh-5rem)] flex flex-col space-y-3 ${
              mobileEditorView === "composer" ? "hidden lg:flex" : "flex"
            }`}
          >
            <DiscordMessagePreview
              content={content}
              mode={mode}
              embeds={embeds}
              attachments={attachments}
              replyData={replyConfig?.preview}
              botInfo={botInfo}
              channelName={selectedChannel?.name || "general"}
            />

            {/* Quick Send CTA */}
            <button
              type="button"
              onClick={() => {
                if (validateCurrentState()) {
                  setIsPublishModalOpen(true);
                } else {
                  showToast?.("Please complete all message requirements before sending.", "error");
                }
              }}
              className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold inline-flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all"
            >
              <Send className="w-4 h-4" />
              <span>Send Now to #{selectedChannel?.name || "channel"}</span>
            </button>
          </div>
        </div>
      )}

      {/* VIEW: MESSAGE HISTORY */}
      {activeTab === "history" && (
        <div className="p-6 rounded-3xl glass-panel bg-slate-900/70 border border-white/5">
          <MessageHistory
            history={history}
            channels={channels}
            onLoadPayload={handleLoadPayload}
            onOpenEditModal={(item) => setEditingHistoryItem(item)}
            onDeleteMessage={onDeletePublishedMessage}
            onDeleteHistoryEntry={onDeleteHistoryEntry}
            onClearHistory={onClearHistory}
          />
        </div>
      )}

      {/* VIEW: SAVED TEMPLATES */}
      {activeTab === "templates" && (
        <div className="p-6 rounded-3xl glass-panel bg-slate-900/70 border border-white/5">
          <MessageTemplateLibrary
            templates={templates}
            onLoadTemplate={handleLoadTemplate}
            onDuplicateTemplate={onDuplicateTemplate}
            onDeleteTemplate={onDeleteTemplate}
            onOpenSaveTemplateModal={() => setIsSaveTemplateModalOpen(true)}
          />
        </div>
      )}

      {/* VIEW: SAVED DRAFTS */}
      {activeTab === "drafts" && (
        <div className="p-6 rounded-3xl glass-panel bg-slate-900/70 border border-white/5">
          <MessageDraftLibrary
            drafts={drafts}
            onLoadDraft={handleLoadDraft}
            onDeleteDraft={onDeleteDraft}
            onNewDraft={handleNewMessage}
            activeDraftId={currentDraftId}
          />
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 4. Modals */}
      {/* ───────────────────────────────────────────────────────────── */}

      {/* Publish Dialog */}
      <PublishDialog
        isOpen={isPublishModalOpen}
        onClose={() => setIsPublishModalOpen(false)}
        onConfirmPublish={handleConfirmPublish}
        targetChannel={selectedChannel}
        payload={getCurrentPayload()}
        replyConfig={replyConfig}
      />

      {/* Save Template Dialog */}
      <SaveTemplateModal
        isOpen={isSaveTemplateModalOpen}
        onClose={() => setIsSaveTemplateModalOpen(false)}
        onSaveTemplate={handleSaveAsTemplate}
        initialName={messageName}
      />

      {/* Edit Published Message Modal */}
      {editingHistoryItem && (
        <EditPublishedModal
          key={editingHistoryItem.id || editingHistoryItem.message_id}
          isOpen={Boolean(editingHistoryItem)}
          onClose={() => setEditingHistoryItem(null)}
          historyItem={editingHistoryItem}
          channels={channels}
          onConfirmEdit={onEditPublishedMessage}
        />
      )}
    </div>
  );
}
