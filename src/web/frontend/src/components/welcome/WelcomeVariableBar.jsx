import React, { useState } from "react";
import { Sparkles, Copy, Check } from "lucide-react";

export const WELCOME_VARIABLES = [
  { tag: "{user}", label: "Mention User", desc: "Mentions new member (@User)" },
  { tag: "{username}", label: "Username", desc: "Member's username" },
  { tag: "{server}", label: "Server Name", desc: "Guild name" },
  { tag: "{memberCount}", label: "Member Count", desc: "e.g. 1,420" },
  { tag: "{memberCountOrdinal}", label: "Ordinal Count", desc: "e.g. 1st, 2nd, 100th" },
  { tag: "{accountAge}", label: "Account Age", desc: "e.g. 4 months old" },
  { tag: "{tag}", label: "User Tag", desc: "Username with discriminator" },
  { tag: "{userAvatar}", label: "Avatar URL", desc: "Direct link to user avatar" },
  { tag: "{serverIcon}", label: "Server Icon URL", desc: "Direct link to guild icon" },
];

export default function WelcomeVariableBar({ onInsertVariable }) {
  const [copiedTag, setCopiedTag] = useState(null);

  const handleClick = (tag) => {
    if (onInsertVariable) {
      onInsertVariable(tag);
    } else {
      navigator.clipboard.writeText(tag);
    }
    setCopiedTag(tag);
    setTimeout(() => setCopiedTag(null), 1800);
  };

  return (
    <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-white/[0.08] backdrop-blur-md">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-semibold text-slate-200">Dynamic Variables</span>
          <span className="text-[10px] text-slate-400 hidden sm:inline">
            (Click to insert into active message)
          </span>
        </div>
        <span className="text-[10px] font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
          Template Engine
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {WELCOME_VARIABLES.map((v) => {
          const isCopied = copiedTag === v.tag;
          return (
            <button
              key={v.tag}
              type="button"
              onClick={() => handleClick(v.tag)}
              title={`${v.label}: ${v.desc}`}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-indigo-600/20 text-slate-300 hover:text-indigo-300 border border-white/[0.06] hover:border-indigo-500/30 text-xs font-mono transition-all group cursor-pointer"
            >
              <span>{v.tag}</span>
              {isCopied ? (
                <Check className="w-3 h-3 text-emerald-400" />
              ) : (
                <Copy className="w-3 h-3 opacity-40 group-hover:opacity-100 transition-opacity" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
