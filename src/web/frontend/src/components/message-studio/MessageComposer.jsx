import React, { useState, useEffect, useRef } from "react";
import {
  Send,
  Save,
  Bookmark,
  FilePlus,
  Sliders,
  PenTool,
  Eye,
  Layers,
  MessageSquare,
  Sparkles,
  Check,
  AlertCircle,
  Hash,
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
  showToast,
}) {
  // Main Message State
  const [currentDraftId, setCurrentDraftId] = useState(null);
  const [revision, setRevision] = useState(1);
  const [messageName, setMessageName] = useState("Untitled Message");
  const [mode, setMode] = useState("normal"); // "normal" | "embed" | "hybrid"
  const [content, setContent] = useState("");
  const [embeds, setEmbeds] = useState([DEFAULT_EMBED]);
  const [attachments, setAttachments] = useState([]);
  const [channelId, setChannelId] = useState(channels[0]?.id || "");
  const [replyConfig, setReplyConfig] = useState({
    enabled: false,
    message_url: "",
    channel_id: null,
    message_id: null,
    mention_user: false,
    preview: null,
  });

  // UI States
  const [leftTab, setLeftTab] = useState("drafts"); // "drafts" | "templates" | "history"
  const [mobileTab, setMobileTab] = useState("editor"); // "config" | "editor" | "preview"
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
          setRevision(savedDraft.revision || (revision + 1));
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
    setSaveStatus("saved");
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
    if (draft.reply_config) setReplyConfig(draft.reply_config);
    setSaveStatus("saved");
    setMobileTab("editor");
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
    setMobileTab("editor");
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
    if (payload.reply_config) setReplyConfig(payload.reply_config);
    if (payload.channel_id) setChannelId(payload.channel_id);
    setSaveStatus("unsaved");
    setMobileTab("editor");
    showToast?.("Restored payload into message composer.", "info");
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
        setRevision(savedDraft.revision || (revision + 1));
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
      category: templateMeta.category,
      description: templateMeta.description,
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
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-3xl glass-panel border border-white/5 bg-slate-900/60 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600/15 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base font-extrabold text-white tracking-tight">Message Studio</h1>
              <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 text-[10px] font-mono font-bold uppercase tracking-wider border border-indigo-500/20">
                PRO COMPOSER
              </span>
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
              Visual Noctaly-grade Discord message & embed builder
            </p>
          </div>
        </div>

        {/* Global Toolbar Actions */}
        <div className="flex items-center gap-2">
          {/* New Canvas */}
          <button
            type="button"
            onClick={handleNewMessage}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors border border-white/5"
            title="Start new blank message"
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
          >
            <Save className="w-4 h-4 text-indigo-400" />
            <span className="hidden sm:inline">Save Draft</span>
          </button>

          {/* Save as Template */}
          <button
            type="button"
            onClick={() => setIsSaveTemplateModalOpen(true)}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors border border-white/5"
          >
            <Bookmark className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Template</span>
          </button>

          {/* Publish Button */}
          <button
            type="button"
            onClick={() => {
              if (validateCurrentState()) {
                setIsPublishModalOpen(true);
              } else {
                showToast?.("Please check requirements before publishing.", "error");
              }
            }}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold inline-flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all"
          >
            <Send className="w-4 h-4" />
            <span>Send to Discord</span>
          </button>
        </div>
      </div>

      {/* Mobile Tab Switcher */}
      <div className="lg:hidden flex rounded-2xl bg-slate-900/80 p-1 border border-white/5">
        <button
          type="button"
          onClick={() => setMobileTab("config")}
          className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${
            mobileTab === "config" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Config</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab("editor")}
          className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${
            mobileTab === "editor" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
          }`}
        >
          <PenTool className="w-3.5 h-3.5" />
          <span>Editor</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab("preview")}
          className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${
            mobileTab === "preview" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Preview</span>
        </button>
      </div>

      {/* Main 3-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-0">
        {/* Left Column: Configuration & Saved Libraries (3 cols) */}
        <div
          className={`lg:col-span-3 space-y-4 overflow-y-auto pr-1 ${
            mobileTab !== "config" ? "hidden lg:block" : "block"
          }`}
        >
          {/* Message Settings Card */}
          <div className="p-4 rounded-3xl glass-panel bg-slate-900/60 border border-white/5 space-y-4">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wide block">
              Message Configuration
            </span>

            {/* Message Name */}
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Message Name</label>
              <input
                type="text"
                value={messageName}
                onChange={(e) => setMessageName(e.target.value)}
                placeholder="Message name..."
                maxLength={100}
                className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-white/10 text-white text-xs placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
              />
            </div>

            {/* Mode Selector */}
            <div>
              <label className="block text-[11px] text-slate-400 mb-1.5">Message Format</label>
              <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-slate-950 border border-white/5">
                <button
                  type="button"
                  onClick={() => setMode("normal")}
                  className={`py-1.5 rounded-lg text-xs font-semibold transition-all ${
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
                  className={`py-1.5 rounded-lg text-xs font-semibold transition-all ${
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
                  className={`py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    mode === "hybrid"
                      ? "bg-indigo-600 text-white shadow"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Hybrid
                </button>
              </div>
            </div>

            {/* Destination Channel Selector */}
            <div>
              <label className="block text-[11px] text-slate-400 mb-1.5">Target Channel</label>
              <ChannelSelector
                channels={channels}
                value={channelId}
                onChange={setChannelId}
                placeholder="Select text channel..."
              />
            </div>
          </div>

          {/* Reply Settings */}
          <ReplyMessageSelector
            guildId={guildId}
            replyConfig={replyConfig}
            onChangeReplyConfig={setReplyConfig}
            currentChannelId={channelId}
            onSelectChannel={setChannelId}
          />

          {/* Saved Libraries Accordion / Tabs */}
          <div className="p-4 rounded-3xl glass-panel bg-slate-900/60 border border-white/5 space-y-3">
            <div className="flex rounded-xl bg-slate-950 p-1 border border-white/5">
              <button
                type="button"
                onClick={() => setLeftTab("drafts")}
                className={`flex-1 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                  leftTab === "drafts" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                Drafts ({drafts.length})
              </button>
              <button
                type="button"
                onClick={() => setLeftTab("templates")}
                className={`flex-1 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                  leftTab === "templates"
                    ? "bg-indigo-600 text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Templates ({templates.length})
              </button>
              <button
                type="button"
                onClick={() => setLeftTab("history")}
                className={`flex-1 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                  leftTab === "history"
                    ? "bg-indigo-600 text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                History
              </button>
            </div>

            {leftTab === "drafts" && (
              <MessageDraftLibrary
                drafts={drafts}
                onLoadDraft={handleLoadDraft}
                onDeleteDraft={onDeleteDraft}
                onNewDraft={handleNewMessage}
                activeDraftId={currentDraftId}
              />
            )}

            {leftTab === "templates" && (
              <MessageTemplateLibrary
                templates={templates}
                onLoadTemplate={handleLoadTemplate}
                onDuplicateTemplate={onDuplicateTemplate}
                onDeleteTemplate={onDeleteTemplate}
                onOpenSaveTemplateModal={() => setIsSaveTemplateModalOpen(true)}
              />
            )}

            {leftTab === "history" && (
              <MessageHistory
                history={history}
                channels={channels}
                onLoadPayload={handleLoadPayload}
                onOpenEditModal={(item) => setEditingHistoryItem(item)}
                onDeleteMessage={onDeletePublishedMessage}
              />
            )}
          </div>
        </div>

        {/* Center Column: Visual Editor (5 cols) */}
        <div
          className={`lg:col-span-5 space-y-4 overflow-y-auto pr-1 ${
            mobileTab !== "editor" ? "hidden lg:block" : "block"
          }`}
        >
          {/* Validation Errors Notice */}
          <MessageValidationSummary errors={validationErrors} />

          {/* Normal Message Editor (shown in normal & hybrid modes) */}
          {(mode === "normal" || mode === "hybrid") && (
            <div className="p-4 rounded-3xl glass-panel bg-slate-900/60 border border-white/5 space-y-3">
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

          {/* Embed Message Editor (shown in embed & hybrid modes) */}
          {(mode === "embed" || mode === "hybrid") && (
            <div className="p-4 rounded-3xl glass-panel bg-slate-900/60 border border-white/5 space-y-3">
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

        {/* Right Column: Live Client Preview (4 cols, sticky on desktop) */}
        <div
          className={`lg:col-span-4 lg:sticky lg:top-4 self-start max-h-[calc(100vh-3rem)] flex flex-col ${
            mobileTab !== "preview" ? "hidden lg:block" : "block"
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
        </div>
      </div>

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
