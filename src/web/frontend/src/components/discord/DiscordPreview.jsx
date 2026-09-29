import React from "react";
import EmojiBadge from "./EmojiBadge";
import { getDiscordAvatarUrl } from "../../utils/discord";

export default function DiscordPreview({ botInfo, user, trigger, isEmbed, embedTitle, reply, imageUrl, reactions }) {
  const botAvatar = getDiscordAvatarUrl(botInfo);
  const userAvatar = getDiscordAvatarUrl(user);
  
  // Format variables for preview
  const formatText = (text) => {
    if (!text) return "";
    return text
      .replace(/{user}/g, `<@${user?.id || "123456789"}>`)
      .replace(/{username}/g, user?.username || "Member")
      .replace(/{server}/g, "Digital Vigital")
      .replace(/{channel}/g, "#general");
  };

  return (
    <div className="bg-[#313338] rounded-2xl overflow-hidden font-sans text-[15px] leading-relaxed shadow-lg border border-white/5 selection:bg-[#5865F2]/30 selection:text-white max-w-full">
      <div className="bg-[#2B2D31] px-4 py-2 border-b border-black/20 text-xs font-bold text-[#80848E] uppercase tracking-wider flex items-center gap-2">
        <span>PREVIEW</span>
      </div>

      <div className="p-4 space-y-4">
        {/* User Trigger Message */}
        {trigger && (
          <div className="flex gap-4 group">
            <img src={userAvatar} alt="User" className="w-10 h-10 rounded-full mt-0.5 shrink-0 bg-[#2B2D31]" />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <span className="font-semibold text-white truncate">{user?.username || "Member"}</span>
                <span className="text-xs text-[#80848E]">Today at 12:00 PM</span>
              </div>
              <div className="text-[#DBDEE1] wrap-break-word whitespace-pre-wrap">{trigger}</div>
            </div>
          </div>
        )}

        {/* Bot Response */}
        <div className="flex gap-4 group">
          <div className="relative shrink-0">
            <img src={botAvatar} alt="Bot" className="w-10 h-10 rounded-full mt-0.5 bg-[#2B2D31]" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <span className="font-semibold text-white truncate">{botInfo?.username || "Digital Vigital"}</span>
              <span className="bg-[#5865F2] text-white text-[10px] px-1.5 py-0.5 rounded-[3px] font-semibold flex items-center gap-1 shrink-0">
                <svg className="w-3 h-3" viewBox="0 0 16 16" fill="none"><path d="M7.4 4.4L6 3L3 6L6 9L7.4 7.6L5.8 6H11V10H13V4H5.8L7.4 4.4Z" fill="currentColor"/></svg>
                APP
              </span>
              <span className="text-xs text-[#80848E]">Today at 12:00 PM</span>
            </div>
            
            {!isEmbed ? (
              <div className="text-[#DBDEE1] wrap-break-word whitespace-pre-wrap mt-0.5">
                {formatText(reply) || <span className="opacity-50 italic">Empty response...</span>}
              </div>
            ) : (
              <div className="mt-1.5 border-l-4 border-[#2B2D31] bg-[#2B2D31] rounded-xs p-3 max-w-lg">
                <div className="flex flex-col gap-2">
                  {embedTitle && <div className="font-bold text-white wrap-break-word">{formatText(embedTitle)}</div>}
                  <div className="text-sm text-[#DBDEE1] wrap-break-word whitespace-pre-wrap">
                    {formatText(reply) || <span className="opacity-50 italic">Empty embed description...</span>}
                  </div>
                  {imageUrl && (
                    <img src={imageUrl} alt="Embed" className="rounded-lg max-w-full max-h-75 object-cover mt-2" onError={(e) => e.target.style.display = 'none'} />
                  )}
                </div>
              </div>
            )}

            {/* Reactions */}
            {reactions?.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {reactions.map((emojiStr, idx) => (
                  <EmojiBadge key={idx} emoji={emojiStr} size="sm" />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

