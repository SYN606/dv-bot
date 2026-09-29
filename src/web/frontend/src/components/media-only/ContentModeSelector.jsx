import React from "react";
import { Image as ImageIcon, Film } from "lucide-react";

export default function ContentModeSelector({ imageOnly, onChange }) {
  return (
    <div className="mb-8">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-white mb-1">Allowed Content</h3>
        <p className="text-xs text-slate-400">Choose the strictness of the media filter.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* All Media */}
        <button
          type="button"
          onClick={() => onChange(false)}
          className={`relative p-4 rounded-2xl border text-left transition-all ${
            !imageOnly
              ? "bg-indigo-500/10 border-indigo-500/50 ring-1 ring-indigo-500/50"
              : "bg-slate-900 border-white/10 hover:border-white/20 hover:bg-slate-800"
          }`}
        >
          <div className="flex items-center gap-3 mb-2">
            <Film className={`w-5 h-5 ${!imageOnly ? "text-indigo-400" : "text-slate-400"}`} />
            <span className={`font-bold text-sm ${!imageOnly ? "text-white" : "text-slate-300"}`}>All Media</span>
          </div>
          <p className="text-xs text-slate-400">Images, videos, GIFs and supported attachments.</p>
          {!imageOnly && <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]"></div>}
        </button>

        {/* Images Only */}
        <button
          type="button"
          onClick={() => onChange(true)}
          className={`relative p-4 rounded-2xl border text-left transition-all ${
            imageOnly
              ? "bg-indigo-500/10 border-indigo-500/50 ring-1 ring-indigo-500/50"
              : "bg-slate-900 border-white/10 hover:border-white/20 hover:bg-slate-800"
          }`}
        >
          <div className="flex items-center gap-3 mb-2">
            <ImageIcon className={`w-5 h-5 ${imageOnly ? "text-indigo-400" : "text-slate-400"}`} />
            <span className={`font-bold text-sm ${imageOnly ? "text-white" : "text-slate-300"}`}>Images Only</span>
          </div>
          <p className="text-xs text-slate-400">Images and GIFs only. Videos and other files are removed.</p>
          {imageOnly && <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]"></div>}
        </button>
      </div>
    </div>
  );
}
