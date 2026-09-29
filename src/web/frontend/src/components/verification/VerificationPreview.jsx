import React from "react";
import { ShieldCheck, UserCheck } from "lucide-react";
import { getDiscordAvatarUrl } from "../../utils/discord";

export default function VerificationPreview({ config, roles, botInfo }) {
  const verifiedRole = roles.find(r => r.id === config.verifiedRoleId);
  
  const botAvatar = botInfo ? getDiscordAvatarUrl(botInfo) : "https://cdn.discordapp.com/embed/avatars/0.png";
  const botName = botInfo?.username || "Digital Vigital";

  const resolvedDescription = (config.embedDescription || "")
    .replace(/{verifiedRole}/g, verifiedRole ? `@${verifiedRole.name}` : "@Verified");

  const isAnimatedEmoji = config.buttonEmoji?.startsWith("<a:");
  const emojiMatch = config.buttonEmoji?.match(/<(a)?:([a-zA-Z0-9_]+):([0-9]+)>/);

  return (
    <div className="sticky top-8">
      <h2 className="text-xs font-mono text-slate-500 uppercase tracking-widest font-bold mb-4">
        Live Discord Preview
      </h2>
      
      <div className="glass-panel bg-slate-900/50 p-6 rounded-3xl border border-white/5 relative overflow-hidden">
        <div className="flex gap-4">
          <img 
            src={botAvatar} 
            alt="Bot Avatar" 
            className="w-10 h-10 rounded-full bg-slate-800 shrink-0 border border-white/5" 
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-bold text-white text-base hover:underline cursor-pointer">{botName}</span>
              <span className="text-[10px] font-bold text-white bg-indigo-500 px-1.5 py-0.5 rounded uppercase tracking-wide">BOT</span>
            </div>
            
            <div className="mt-2 bg-slate-800/80 border-l-4 border-indigo-500 rounded-r-lg p-4">
              {config.embedTitle && (
                <div className="font-bold text-white mb-2">{config.embedTitle}</div>
              )}
              <div className="text-slate-300 text-sm whitespace-pre-wrap break-words leading-relaxed">
                {resolvedDescription}
              </div>
            </div>

            <div className="mt-3 inline-flex">
              <button 
                type="button"
                className="flex items-center gap-2 px-4 py-2 rounded-[3px] bg-slate-700 hover:bg-slate-600 transition-colors pointer-events-none border border-slate-900/50"
              >
                {emojiMatch ? (
                  <img
                    src={`https://cdn.discordapp.com/emojis/${emojiMatch[3]}.${isAnimatedEmoji ? "gif" : "png"}`}
                    alt="emoji"
                    className="w-5 h-5 object-contain"
                  />
                ) : (
                  <span className="text-lg leading-none">{config.buttonEmoji || "✅"}</span>
                )}
                <span className="text-sm font-medium text-white">{config.buttonLabel || "Verify Access"}</span>
              </button>
            </div>

            <div className="mt-4 flex items-center gap-1.5 text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
              {config.mode === "button" ? (
                <><UserCheck className="w-3.5 h-3.5" /> Instant Button Mode</>
              ) : (
                <><ShieldCheck className="w-3.5 h-3.5" /> CAPTCHA Mode</>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
