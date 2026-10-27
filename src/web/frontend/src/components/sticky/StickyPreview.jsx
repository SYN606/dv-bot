import React from "react";
import { parseStickyContent } from "../../utils/sticky";
import { Pin } from "lucide-react";
import { getDiscordAvatarUrl } from "../../utils/discord";

export default function StickyPreview({ channelName, content, botInfo }) {
  const { text, imageUrl } = parseStickyContent(content);
  
  const botAvatar = botInfo ? getDiscordAvatarUrl(botInfo) : "https://cdn.discordapp.com/embed/avatars/0.png";
  const botName = botInfo?.username || "DV-BOT";

  return (
    <div className="flex flex-col h-full">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-xs font-mono text-slate-500 uppercase tracking-widest font-bold mb-1">
            Live Discord Preview
          </h3>
          <p className="text-sm text-slate-300 font-semibold truncate">
            #{channelName || "target-channel"}
          </p>
        </div>
        <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded border border-white/10">
          Embed View
        </span>
      </div>

      <div className="flex-1 glass-panel bg-slate-900/50 p-6 rounded-3xl border border-white/5 relative overflow-hidden flex flex-col">
        {!content ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-500 space-y-2">
            <Pin className="w-8 h-8 opacity-30 text-slate-400" />
            <p className="text-sm">Type your message in the editor to see how it renders in Discord.</p>
          </div>
        ) : (
          <div className="flex gap-3.5">
            <img 
              src={botAvatar} 
              alt="Bot Avatar" 
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = "https://cdn.discordapp.com/embed/avatars/0.png";
              }}
              className="w-10 h-10 rounded-full bg-slate-800 shrink-0 object-cover mt-0.5" 
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-bold text-white text-sm hover:underline cursor-pointer">{botName}</span>
                <span className="text-[10px] font-bold text-white bg-indigo-500 px-1 py-0.2 rounded uppercase tracking-wide">
                  BOT
                </span>
                <span className="text-xs text-slate-500 font-mono">Today at {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              
              {/* Authentic Discord Embed with Left Accent Border */}
              <div className="border-l-4 border-cyan-500 bg-slate-950/80 p-4 rounded-r-xl border border-white/5 space-y-2.5 max-w-xl">
                <div className="flex items-center gap-1.5 font-bold text-white text-sm">
                  <span>📌 Sticky Message</span>
                </div>

                <div className="text-slate-200 text-sm whitespace-pre-wrap wrap-break-word leading-relaxed">
                  {text}
                </div>

                {imageUrl && (
                  <div className="mt-2.5 rounded-lg overflow-hidden border border-white/10 max-w-md">
                    <img 
                      src={imageUrl} 
                      alt="Sticky attachment preview" 
                      className="w-full h-auto object-cover max-h-64"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>

              <div className="mt-3 flex items-center gap-2 text-[10px] text-slate-500 font-semibold tracking-wide uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                <span>Auto-reposts to maintain bottom position</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
