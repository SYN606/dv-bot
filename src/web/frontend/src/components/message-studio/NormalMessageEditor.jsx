import React, { useRef } from "react";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  FileCode,
  Quote,
  EyeOff,
  Link as LinkIcon,
  Plus,
  Trash2,
  Paperclip,
  AtSign,
  Hash,
} from "lucide-react";

export default function NormalMessageEditor({
  content = "",
  onChangeContent,
  attachments = [],
  onChangeAttachments,
}) {
  const textareaRef = useRef(null);

  // Helper to wrap selected text with markdown tokens
  const applyMarkdown = (prefix, suffix = prefix, placeholder = "text") => {
    const el = textareaRef.current;
    if (!el) return;

    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selectedText = content.substring(start, end) || placeholder;

    const before = content.substring(0, start);
    const after = content.substring(end);

    const replacement = `${prefix}${selectedText}${suffix}`;
    const newContent = `${before}${replacement}${after}`;

    onChangeContent(newContent);

    // Re-focus and set selection
    setTimeout(() => {
      el.focus();
      const newCursorPos = start + prefix.length + selectedText.length;
      el.setSelectionRange(start + prefix.length, newCursorPos);
    }, 10);
  };

  const handleAddAttachment = () => {
    onChangeAttachments([...attachments, ""]);
  };

  const handleUpdateAttachment = (index, value) => {
    const next = [...attachments];
    next[index] = value;
    onChangeAttachments(next);
  };

  const handleRemoveAttachment = (index) => {
    const next = attachments.filter((_, idx) => idx !== index);
    onChangeAttachments(next);
  };

  const charCount = content ? content.length : 0;
  const isOverLimit = charCount > 2000;

  return (
    <div className="space-y-4">
      {/* Markdown Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-xl bg-slate-900/60 border border-white/5">
        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={() => applyMarkdown("**", "**", "bold")}
            title="Bold (**text**)"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <Bold className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => applyMarkdown("*", "*", "italic")}
            title="Italic (*text*)"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <Italic className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => applyMarkdown("__", "__", "underline")}
            title="Underline (__text__)"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <Underline className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => applyMarkdown("~~", "~~", "strike")}
            title="Strikethrough (~~text~~)"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <Strikethrough className="w-4 h-4" />
          </button>

          <div className="w-[1px] h-4 bg-white/10 mx-1" />

          <button
            type="button"
            onClick={() => applyMarkdown("`", "`", "code")}
            title="Inline Code (`code`)"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <Code className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => applyMarkdown("```\n", "\n```", "code block")}
            title="Code Block (```code```)"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <FileCode className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => applyMarkdown("> ", "", "quote")}
            title="Blockquote (> quote)"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <Quote className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => applyMarkdown("||", "||", "spoiler")}
            title="Spoiler (||text||)"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <EyeOff className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => applyMarkdown("[", "](https://example.com)", "link title")}
            title="Link ([title](url))"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <LinkIcon className="w-4 h-4" />
          </button>

          <div className="w-[1px] h-4 bg-white/10 mx-1" />

          {/* Mentions */}
          <button
            type="button"
            onClick={() => applyMarkdown("{", "}", "USER_ID")}
            title="Mention User: {USER_ID}"
            className="inline-flex items-center gap-1 px-1.5 py-1 rounded-lg text-xs font-semibold text-indigo-400 hover:text-white hover:bg-indigo-500/20 transition-colors"
          >
            <AtSign className="w-3.5 h-3.5" />
            <span className="text-[11px]">User</span>
          </button>
          <button
            type="button"
            onClick={() => applyMarkdown("{#", "}", "CHANNEL_ID")}
            title="Mention Channel: {#CHANNEL_ID}"
            className="inline-flex items-center gap-1 px-1.5 py-1 rounded-lg text-xs font-semibold text-sky-400 hover:text-white hover:bg-sky-500/20 transition-colors"
          >
            <Hash className="w-3.5 h-3.5" />
            <span className="text-[11px]">Channel</span>
          </button>
        </div>

        {/* Character Counter */}
        <span
          className={`text-xs font-mono font-semibold ${
            isOverLimit ? "text-rose-400 font-bold" : "text-slate-400"
          }`}
        >
          {charCount} / 2,000
        </span>
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
        <span>Tip: Enclose an ID in braces like <code className="text-indigo-400 bg-slate-950 px-1 py-0.5 rounded border border-white/5">{"{USER_ID}"}</code> or <code className="text-sky-400 bg-slate-950 px-1 py-0.5 rounded border border-white/5">{"{#CHANNEL_ID}"}</code> to mention users or channels.</span>
      </div>

      {/* Content Textarea */}
      <div>
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => onChangeContent(e.target.value)}
          placeholder="Type your Discord message here... Markdown and emojis supported."
          rows={7}
          className="w-full px-4 py-3 rounded-2xl bg-slate-900/80 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all font-mono leading-relaxed resize-y"
        />
        {isOverLimit && (
          <p className="mt-1.5 text-xs text-rose-400 font-medium">
            Message exceeds Discord's 2,000 character limit by {charCount - 2000} characters.
          </p>
        )}
      </div>

      {/* Attachments Section */}
      <div className="pt-2 border-t border-white/5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
            <Paperclip className="w-4 h-4 text-indigo-400" />
            <span>File & Media Attachments</span>
            <span className="text-slate-500 font-normal">({attachments.length}/10)</span>
          </div>
          {attachments.length < 10 && (
            <button
              type="button"
              onClick={handleAddAttachment}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 hover:text-indigo-300 text-xs font-semibold transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add URL</span>
            </button>
          )}
        </div>

        {attachments.length === 0 ? (
          <p className="text-xs text-slate-500 italic">No attachments attached. Direct image or file URLs can be linked.</p>
        ) : (
          <div className="space-y-2">
            {attachments.map((url, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="url"
                  value={url}
                  onChange={(e) => handleUpdateAttachment(idx, e.target.value)}
                  placeholder="https://example.com/image.png"
                  className="flex-1 px-3 py-2 rounded-xl bg-slate-900/80 border border-white/10 text-white text-xs placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveAttachment(idx)}
                  className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
