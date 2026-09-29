import React, { useRef } from "react";
import { EmojiSelector } from "../discord";

export default function VerificationMessageEditor({ guildId, config, updateConfig }) {
  const textareaRef = useRef(null);

  const handleInsertVariable = (variableKey) => {
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart ?? config.embedDescription.length;
      const end = textarea.selectionEnd ?? config.embedDescription.length;
      const current = config.embedDescription || "";
      const updated = current.substring(0, start) + variableKey + current.substring(end);
      
      updateConfig("embedDescription", updated);
      
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + variableKey.length, start + variableKey.length);
      }, 0);
    } else {
      updateConfig("embedDescription", config.embedDescription + variableKey);
    }
  };

  return (
    <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/5 space-y-6">
      <div className="flex items-center gap-3 border-b border-white/5 pb-4 mb-2">
        <div className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center text-xs font-bold text-indigo-400">3</div>
        <h2 className="text-sm font-bold text-white tracking-wider font-mono uppercase">Verification Message</h2>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
            Embed Title
          </label>
          <input
            type="text"
            value={config.embedTitle}
            onChange={(e) => updateConfig("embedTitle", e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-900 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
            Embed Description
          </label>
          <textarea
            ref={textareaRef}
            value={config.embedDescription}
            onChange={(e) => updateConfig("embedDescription", e.target.value)}
            className="w-full min-h-30 px-4 py-3 bg-slate-900 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors resize-none"
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mr-2">Available Variables:</span>
            <button
              onClick={() => handleInsertVariable("{verifiedRole}")}
              className="text-xs font-mono bg-white/5 hover:bg-white/10 border border-white/10 text-indigo-300 px-2 py-1 rounded-md transition-colors"
            >
              + {`{verifiedRole}`}
            </button>
            <span className="text-[10px] text-slate-500">Role granted after successful verification.</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-white/5">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Button Label
            </label>
            <input
              type="text"
              value={config.buttonLabel}
              onChange={(e) => updateConfig("buttonLabel", e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-900 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
              maxLength={80}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Button Emoji
            </label>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-center text-xl shrink-0">
                {config.buttonEmoji.match(/<(a)?:([a-zA-Z0-9_]+):([0-9]+)>/) ? (
                  <img
                    src={`https://cdn.discordapp.com/emojis/${config.buttonEmoji.match(/<(a)?:([a-zA-Z0-9_]+):([0-9]+)>/)[3]}.${config.buttonEmoji.startsWith("<a:") ? "gif" : "png"}`}
                    alt="emoji"
                    className="w-6 h-6 object-contain"
                  />
                ) : (
                  config.buttonEmoji
                )}
              </div>
              <div className="scale-90 origin-left">
                <EmojiSelector 
                  guildId={guildId}
                  value={[]}
                  onChange={(val) => {
                    if (val.length > 0) updateConfig("buttonEmoji", val[0]);
                  }}
                  multiple={false}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
