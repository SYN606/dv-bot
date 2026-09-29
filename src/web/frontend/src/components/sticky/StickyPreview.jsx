import React from "react";
import { parseStickyContent } from "../../utils/sticky";
import { Pin } from "lucide-react";
import { getDiscordAvatarUrl } from "../../utils/discord";

export default function StickyPreview({ channelName, content, botInfo }) {
  const { text, imageUrl } = parseStickyContent(content);
  
  const botAvatar = botInfo ? getDiscordAvatarUrl(botInfo) : "https://cdn.discordapp.com/embed/avatars/0.png";
  const botName = botInfo?.username || "Digital Vigital";

  return (
    <div className="flex flex-col h-full">
      <div className="mb-4">
        <h3 className="text-xs font-mono text-slate-500 uppercase tracking-widest font-bold mb-1">Live Preview</h3>
        <p className="text-sm text-slate-400 truncate">#{channelName || "channel"}</p>
      </div>

      <div className="flex-1 glass-panel bg-slate-900/50 p-6 rounded-3xl border border-white/5 relative overflow-hidden flex flex-col">
        {!content ? (
          <div className="flex-1 flex items-center justify-center text-center">
            <p className="text-sm text-slate-500">Your sticky notice preview will appear here.</p>
          </div>
        ) : (
          <div className="flex gap-4">
            <img 
              src={botAvatar} 
              alt="Bot Avatar" 
              className="w-10 h-10 rounded-full bg-slate-800 shrink-0" 
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-white text-base">{botName}</span>
                <span className="text-[10px] font-bold text-white bg-indigo-500 px-1.5 py-0.5 rounded uppercase tracking-wide">BOT</span>
              </div>
              
              <div className="text-slate-300 text-sm whitespace-pre-wrap wrap-break-word leading-relaxed mb-3">
                <div className="flex items-center gap-2 font-bold text-white mb-2 pb-2 border-b border-white/5 w-fit pr-4">
                  <Pin className="w-4 h-4 text-indigo-400" />
                  Sticky Notice
                </div>
                {text}
              </div>

              {imageUrl && (
                <div className="mt-3 rounded-xl overflow-hidden border border-white/10 max-w-sm">
                  <img src={imageUrl} alt="Sticky attachment" className="w-full h-auto object-cover" />
                </div>
              )}

              <div className="mt-4 pt-3 border-t border-white/5 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0"></div>
                <span className="text-[10px] text-slate-500 font-semibold tracking-wide uppercase">Sticky notice • Auto-reposts after activity</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
