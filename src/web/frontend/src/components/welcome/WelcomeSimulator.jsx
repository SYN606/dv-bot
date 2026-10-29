import React, { useState } from "react";
import { Sparkles, Eye, Hash, MessageSquare, Mail, UserMinus } from "lucide-react";

export default function WelcomeSimulator({ config, guildMeta }) {
  const [activeTab, setActiveTab] = useState("welcome"); // "welcome" | "leave" | "dm"

  const serverName = guildMeta?.name || "Cyber Guild";
  const memberCount = guildMeta?.memberCount ? String(guildMeta.memberCount) : "1,337";
  const mockUser = {
    username: "AlexDev",
    tag: "AlexDev#0001",
    id: "987654321012345678",
    avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=128&auto=format&fit=crop&q=80",
    accountAge: "6 months old",
  };

  const replaceVariables = (str) => {
    if (!str) return "";
    return str
      .replace(/\{user\}/gi, `@${mockUser.username}`)
      .replace(/\{username\}/gi, mockUser.username)
      .replace(/\{tag\}/gi, mockUser.tag)
      .replace(/\{server\}/gi, serverName)
      .replace(/\{memberCount\}/gi, memberCount)
      .replace(/\{memberCountOrdinal\}/gi, `${memberCount}th`)
      .replace(/\{userAvatar\}/gi, mockUser.avatar)
      .replace(/\{serverIcon\}/gi, guildMeta?.iconUrl || mockUser.avatar)
      .replace(/\{accountAge\}/gi, mockUser.accountAge);
  };

  // Helper to render rudimentary markdown bold
  const renderMarkdown = (text) => {
    if (!text) return null;
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={i} className="text-white font-bold">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  return (
    <div className="sticky top-6 rounded-3xl bg-slate-900/80 border border-white/[0.08] backdrop-blur-2xl overflow-hidden shadow-2xl">
      {/* Simulator Header */}
      <div className="p-4 bg-slate-950/70 border-b border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-bold text-white tracking-wide">Live Discord Simulator</span>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-white/5">
          Real-Time Preview
        </span>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="flex border-b border-white/[0.06] bg-slate-900/40 p-1.5 gap-1">
        <button
          type="button"
          onClick={() => setActiveTab("welcome")}
          className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            activeTab === "welcome"
              ? "bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 shadow-sm"
              : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Welcome</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("leave")}
          className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            activeTab === "leave"
              ? "bg-rose-600/30 text-rose-300 border border-rose-500/30 shadow-sm"
              : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
          }`}
        >
          <UserMinus className="w-3.5 h-3.5" />
          <span>Goodbye</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("dm")}
          className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            activeTab === "dm"
              ? "bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 shadow-sm"
              : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
          }`}
        >
          <Mail className="w-3.5 h-3.5" />
          <span>Direct Msg</span>
        </button>
      </div>

      {/* Discord Chat Area */}
      <div className="p-4 sm:p-5 bg-[#313338] min-h-[300px] flex flex-col justify-start text-[14px] leading-relaxed">
        {/* Channel Indicator Header */}
        <div className="flex items-center gap-2 pb-3 mb-3 border-b border-[#3f4147] text-[#949ba4] text-xs font-medium">
          {activeTab === "dm" ? (
            <>
              <Mail className="w-3.5 h-3.5 text-[#dbdee1]" />
              <span className="text-[#dbdee1] font-semibold">Direct Message with DV-BOT</span>
            </>
          ) : (
            <>
              <Hash className="w-4 h-4 text-[#80848e]" />
              <span className="text-[#dbdee1] font-semibold">
                {activeTab === "welcome"
                  ? (config.welcome_channel_id ? "welcome" : "welcome-channel")
                  : (config.leave_channel_id ? "goodbye" : "goodbye-channel")}
              </span>
            </>
          )}
        </div>

        {/* Message Item */}
        <div className="flex items-start gap-3.5">
          {/* Bot Avatar */}
          <div className="w-10 h-10 rounded-full bg-indigo-600 overflow-hidden shrink-0 shadow-md">
            <img
              src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=128&auto=format&fit=crop&q=80"
              alt="Bot Avatar"
              className="w-full h-full object-cover"
            />
          </div>

          <div className="flex-1 min-w-0">
            {/* Header / Bot Tag */}
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-white text-[14px]">DV-BOT</span>
              <span className="bg-[#5865F2] text-white text-[10px] font-bold px-1.5 py-0.2 rounded uppercase tracking-wide">
                BOT
              </span>
              <span className="text-[11px] text-[#949ba4] ml-1">Today at 12:00 PM</span>
            </div>

            {/* TAB: Welcome */}
            {activeTab === "welcome" && (
              <div>
                {/* Ping Outside Embed */}
                {config.welcome_ping_user && (
                  <div className="text-[#c9cdfb] font-medium bg-[#5865F2]/20 px-1 rounded inline-block mb-1.5 text-xs">
                    @{mockUser.username}
                  </div>
                )}

                {/* Plain Text or Embed */}
                {!config.welcome_is_embed ? (
                  <div className="text-[#dbdee1] whitespace-pre-wrap text-[13px] leading-relaxed">
                    {renderMarkdown(replaceVariables(config.welcome_message))}
                  </div>
                ) : (
                  <div
                    className="mt-1.5 max-w-md rounded-lg bg-[#2b2d31] border-l-4 p-3.5 shadow-md flex flex-col gap-2 relative overflow-hidden"
                    style={{ borderColor: config.welcome_embed_color || "#6366F1" }}
                  >
                    {/* Title & Description with Thumbnail */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        {config.welcome_embed_title && (
                          <div className="font-bold text-white text-[14px] mb-1">
                            {replaceVariables(config.welcome_embed_title)}
                          </div>
                        )}
                        <div className="text-[#dbdee1] text-[13px] leading-relaxed whitespace-pre-wrap">
                          {renderMarkdown(replaceVariables(config.welcome_message))}
                        </div>
                      </div>

                      {/* Thumbnail (User Avatar) */}
                      {config.welcome_show_thumbnail && (
                        <div className="w-14 h-14 rounded-full overflow-hidden shrink-0 border border-white/10 shadow">
                          <img
                            src={mockUser.avatar}
                            alt="User Thumbnail"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                    </div>

                    {/* Banner Image */}
                    {config.welcome_image_url && (
                      <div className="mt-1.5 rounded-md overflow-hidden max-h-48 border border-white/5 bg-slate-900/60">
                        <img
                          src={config.welcome_image_url}
                          alt="Banner Preview"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      </div>
                    )}

                    {/* Footer */}
                    {config.welcome_embed_footer && (
                      <div className="pt-2 border-t border-white/5 text-[11px] text-[#949ba4] flex items-center gap-1.5">
                        <span>{replaceVariables(config.welcome_embed_footer)}</span>
                        <span>•</span>
                        <span>Today at 12:00 PM</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* TAB: Leave */}
            {activeTab === "leave" && (
              <div>
                {!config.leave_is_embed ? (
                  <div className="text-[#dbdee1] whitespace-pre-wrap text-[13px] leading-relaxed">
                    {renderMarkdown(replaceVariables(config.leave_message))}
                  </div>
                ) : (
                  <div
                    className="mt-1.5 max-w-md rounded-lg bg-[#2b2d31] border-l-4 p-3.5 shadow-md flex flex-col gap-2"
                    style={{ borderColor: config.leave_embed_color || "#F43F5E" }}
                  >
                    {config.leave_embed_title && (
                      <div className="font-bold text-white text-[14px]">
                        {replaceVariables(config.leave_embed_title)}
                      </div>
                    )}
                    <div className="text-[#dbdee1] text-[13px] leading-relaxed whitespace-pre-wrap">
                      {renderMarkdown(replaceVariables(config.leave_message))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB: Direct Message */}
            {activeTab === "dm" && (
              <div className="text-[#dbdee1] whitespace-pre-wrap text-[13px] leading-relaxed">
                {renderMarkdown(replaceVariables(config.dm_message))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
