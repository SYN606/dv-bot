import React, { useRef } from "react";
import { ChannelSelector, EmojiSelector } from "../discord";
import Switch from "../ui/Switch";
import { Plus, Pin } from "lucide-react";

export default function StickyEditor({ 
  guildId, 
  channels, 
  editor, 
  updateEditor, 
  hasChanges, 
  isEditing, 
  onSave, 
  saving, 
  onReset 
}) {
  const textareaRef = useRef(null);

  const insertEmoji = (emojiRaw) => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    const newContent = editor.content.substring(0, start) + emojiRaw + editor.content.substring(end);
    updateEditor("content", newContent);

    // Restore cursor position after state updates
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + emojiRaw.length, start + emojiRaw.length);
    }, 0);
  };

  const isOverLimit = (editor.content || "").length > 2000;
  const isSaveDisabled = !editor.channelId || !editor.content.trim() || saving || isOverLimit;

  return (
    <div className="flex flex-col h-full glass-panel bg-slate-900/50 p-6 rounded-3xl border border-white/5">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-bold text-white tracking-wider flex items-center gap-2">
          <Pin className="w-4 h-4 text-brand-crimson" />
          {isEditing ? "EDIT STICKY NOTICE" : "NEW STICKY NOTICE"}
          {isEditing && hasChanges && (
            <span className="text-[10px] font-mono text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
              Unsaved changes
            </span>
          )}
        </h3>
        {isEditing && (
          <button 
            onClick={onReset}
            className="text-xs font-semibold text-brand-crimson hover:text-white transition-colors flex items-center gap-1 bg-brand-crimson/10 hover:bg-brand-crimson/20 border border-brand-crimson/20 px-2.5 py-1 rounded-lg"
          >
            <Plus className="w-3.5 h-3.5" />
            New Notice
          </button>
        )}
      </div>

      <div className="space-y-6 flex-1 flex flex-col">
        {/* Channel Selection */}
        <div>
          <label className="block text-xs font-mono text-slate-500 uppercase tracking-widest font-bold mb-2">
            Target Channel
          </label>
          <ChannelSelector 
            guildId={guildId}
            channels={channels}
            value={editor.channelId}
            onChange={(val) => updateEditor("channelId", val)}
            allowedTypes={["text"]}
            placeholder="Select or search channel..."
          />
        </div>

        {/* Message Composer */}
        <div className="flex-1 flex flex-col">
          <label className="block text-xs font-mono text-slate-500 uppercase tracking-widest font-bold mb-1">
            Notice Content
          </label>
          <p className="text-[11px] text-slate-400 mb-2">
            Supports Discord formatting, custom server emojis, and an optional image link.
          </p>
          <div className="flex-1 flex flex-col relative border border-white/10 rounded-xl bg-slate-950 focus-within:border-brand-crimson/50 transition-colors">
            <textarea
              ref={textareaRef}
              value={editor.content}
              onChange={(e) => updateEditor("content", e.target.value)}
              className="w-full flex-1 min-h-37.5 p-3 bg-transparent text-sm text-white placeholder-slate-600 resize-none focus:outline-none"
              placeholder="Write your sticky notice..."
            />
            <div className="px-3 py-2 border-t border-white/5 bg-slate-900/50 rounded-b-xl flex justify-between items-center">
              <div className="scale-90 origin-left">
                <EmojiSelector 
                  guildId={guildId}
                  value={[]}
                  onChange={(val) => {
                    if (val.length > 0) insertEmoji(val[0]);
                  }}
                  multiple={false}
                />
              </div>
              <span className={`text-[10px] font-mono ${isOverLimit ? "text-rose-400 font-bold" : "text-slate-500"}`}>
                {editor.content.length} / 2000 chars
              </span>
            </div>
          </div>
        </div>

        {/* Deploy Settings */}
        <div className="p-4 rounded-2xl bg-slate-950 border border-white/5 flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-bold text-white mb-1">Deploy immediately</div>
            <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
              {editor.postNow 
                ? "Send or refresh this notice immediately when the configuration is saved."
                : "The notice will post when the next qualifying channel activity occurs."}
            </p>
          </div>
          <div className="shrink-0 mt-1">
            <Switch 
              checked={editor.postNow}
              onChange={(checked) => updateEditor("postNow", checked)}
            />
          </div>
        </div>

        {/* Save Action */}
        <div className="pt-2">
          <button
            onClick={onSave}
            disabled={isSaveDisabled}
            className="w-full py-3 rounded-xl bg-brand-crimson hover:bg-brand-crimson-dark text-white font-bold transition-all shadow-lg shadow-brand-crimson/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving
              ? "Saving..."
              : isEditing
              ? (editor.postNow ? "Save & Deploy Notice" : "Save Changes")
              : (editor.postNow ? "Create & Deploy Notice" : "Create Notice")}
          </button>
        </div>
      </div>
    </div>
  );
}
