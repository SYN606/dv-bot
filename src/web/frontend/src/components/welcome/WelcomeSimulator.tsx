import React, { useState } from "react";
import { Eye, Hash, MessageSquare, Mail, UserMinus, ExternalLink } from "lucide-react";

export default function WelcomeSimulator({ config, guildMeta }) {
  const [activeTab, setActiveTab] = useState("welcome"); // "welcome" | "leave" | "dm"

  const serverName = guildMeta?.name || "Cyber Guild";
  const memberCount = guildMeta?.memberCount ? String(guildMeta.memberCount) : "1,337";

  const mockUser = {
    username: "AlexDev",
    displayName: "Alex (Staff Lead)",
    normalName: "Alex (Staff Lead)",
    nickname: "Alex (Staff Lead)",
    tag: "AlexDev#0001",
    id: "987654321012345678",
    avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=128&auto=format&fit=crop&q=80",
    accountAge: "6 months old",
    joinedAge: "4 months ago",
    roles: "@Moderator, @VIP Supporter, @Community Lead",
    rolesMentions: "@Moderator @VIP Supporter",
    roleCount: "3",
  };

  const serverIcon = guildMeta?.icon
    ? `https://cdn.discordapp.com/icons/${guildMeta.id}/${guildMeta.icon}.png?size=128`
    : "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=128&auto=format&fit=crop&q=80";

  const replaceVariables = (str) => {
    if (!str || typeof str !== "string") return "";
    return str
      .replace(/\{user\}/gi, `@${mockUser.username}`)
      .replace(/\{id\}/gi, mockUser.id)
      .replace(/\{userId\}/gi, mockUser.id)
      .replace(/\{username\}/gi, mockUser.username)
      .replace(/\{displayName\}/gi, mockUser.displayName)
      .replace(/\{nickname\}/gi, mockUser.nickname)
      .replace(/\{normalName\}/gi, mockUser.normalName)
      .replace(/\{roles\}/gi, mockUser.roles)
      .replace(/\{rolesMentions\}/gi, mockUser.rolesMentions)
      .replace(/\{roleCount\}/gi, mockUser.roleCount)
      .replace(/\{joinedAge\}/gi, mockUser.joinedAge)
      .replace(/\{tag\}/gi, mockUser.tag)
      .replace(/\{server\}/gi, serverName)
      .replace(/\{memberCount\}/gi, memberCount)
      .replace(/\{memberCountOrdinal\}/gi, `${memberCount}th`)
      .replace(/\{userAvatar\}/gi, mockUser.avatar)
      .replace(/\{serverIcon\}/gi, serverIcon)
      .replace(/\{accountAge\}/gi, mockUser.accountAge);
  };

  const renderInline = (text, keyPrefix = "") => {
    if (!text) return null;
    const parts = text.split(/(\*\*.*?\*\*|`.*?`|<@[!&]?\d+>|@\w+)/g);
    return parts.map((part, i) => {
      const k = `${keyPrefix}-${i}`;
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={k} className="text-white font-bold">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith("`") && part.endsWith("`")) {
        return (
          <code key={k} className="bg-[#1e1f22] text-[#e0e1e5] px-1 py-0.5 rounded font-mono text-[11px] border border-white/5">
            {part.slice(1, -1)}
          </code>
        );
      }
      if (part.startsWith("@") || part.startsWith("<@")) {
        return (
          <span key={k} className="bg-[#5865f2]/20 text-[#c9cdfb] font-medium px-1 py-0.5 rounded text-[12px]">
            {part}
          </span>
        );
      }
      return part;
    });
  };

  const renderMarkdown = (text) => {
    if (!text) return null;
    const lines = text.split("\n");
    return lines.map((line, idx) => {
      const trimmed = line.trim();
      if (trimmed.startsWith("# ")) {
        return (
          <h1 key={idx} className="text-base sm:text-lg font-black text-white tracking-tight mt-1.5 mb-1">
            {renderInline(trimmed.slice(2), `h1-${idx}`)}
          </h1>
        );
      }
      if (trimmed.startsWith("## ")) {
        return (
          <h2 key={idx} className="text-sm sm:text-base font-bold text-white tracking-tight mt-1 mb-0.5">
            {renderInline(trimmed.slice(3), `h2-${idx}`)}
          </h2>
        );
      }
      if (trimmed.startsWith("### ")) {
        return (
          <h3 key={idx} className="text-xs sm:text-sm font-bold text-slate-100 mt-1 mb-0.5">
            {renderInline(trimmed.slice(4), `h3-${idx}`)}
          </h3>
        );
      }
      if (trimmed.startsWith("> ")) {
        return (
          <div key={idx} className="border-l-[3px] border-[#4e5058] pl-2.5 my-0.5 text-[13px] text-[#dbdee1] bg-white/[0.02] py-0.5 rounded-r">
            {renderInline(trimmed.slice(2), `q-${idx}`)}
          </div>
        );
      }
      if (trimmed === "") {
        return <div key={idx} className="h-1.5" />;
      }
      return (
        <div key={idx} className="text-[#dbdee1] text-[13px] leading-relaxed">
          {renderInline(line, `p-${idx}`)}
        </div>
      );
    });
  };

  const fields = Array.isArray(config.welcome_embed_fields) ? config.welcome_embed_fields : [];

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

      {/* Tabs for Preview Selector */}
      <div className="p-2 bg-slate-900/90 border-b border-white/[0.04] flex items-center gap-1">
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
      <div className="p-4 sm:p-5 bg-[#313338] min-h-[340px] flex flex-col justify-start text-[14px] leading-relaxed">
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
              <span className="text-[#949ba4] text-[11px]">Today at 12:00 PM</span>
            </div>

            {/* TAB: Welcome */}
            {activeTab === "welcome" && (
              <div>
                {config.welcome_ping_user && (
                  <div className="text-[#c9cdfb] font-medium text-[13px] mb-1">
                    @{mockUser.username}
                  </div>
                )}

                {!config.welcome_is_embed ? (
                  <div className="text-[#dbdee1] whitespace-pre-wrap text-[13px] leading-relaxed">
                    {renderMarkdown(replaceVariables(config.welcome_message))}
                  </div>
                ) : (
                  <div
                    className="mt-1.5 max-w-lg rounded-lg bg-[#2b2d31] border-l-4 p-4 shadow-md flex flex-col gap-2.5"
                    style={{ borderColor: config.welcome_embed_color || "#6366F1" }}
                  >
                    {/* Author Header */}
                    {config.welcome_embed_author && (
                      <div className="flex items-center gap-2 text-xs font-semibold text-white">
                        {config.welcome_embed_author_icon && (
                          <img
                            src={replaceVariables(config.welcome_embed_author_icon)}
                            alt="Author Icon"
                            className="w-4 h-4 rounded-full object-cover"
                            onError={(e) => { e.currentTarget.style.display = "none"; }}
                          />
                        )}
                        <span>{replaceVariables(config.welcome_embed_author)}</span>
                      </div>
                    )}

                    {/* Title + Body + Thumbnail row */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        {config.welcome_embed_title && (
                          <div className="font-bold text-white text-[15px] mb-1 flex items-center gap-1.5">
                            <span>{replaceVariables(config.welcome_embed_title)}</span>
                            {config.welcome_embed_title_url && (
                              <ExternalLink className="w-3.5 h-3.5 text-indigo-400 opacity-70" />
                            )}
                          </div>
                        )}
                        <div className="text-[#dbdee1] text-[13px] leading-relaxed whitespace-pre-wrap">
                          {renderMarkdown(replaceVariables(config.welcome_message))}
                        </div>
                      </div>

                      {/* Thumbnail */}
                      {config.welcome_show_thumbnail && (
                        <div className="w-16 h-16 rounded-full overflow-hidden shrink-0 border border-white/10 shadow bg-slate-900/50">
                          <img
                            src={
                              config.welcome_thumbnail_type === "server_icon"
                                ? serverIcon
                                : mockUser.avatar
                            }
                            alt="Thumbnail"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                    </div>

                    {/* Custom Embed Fields */}
                    {fields.length > 0 && (
                      <div className="grid grid-cols-2 gap-2.5 pt-1.5">
                        {fields.map((f, i) => (
                          <div
                            key={i}
                            className={`rounded bg-[#1e1f22]/70 p-2 border border-white/5 ${
                              f.inline ? "col-span-1" : "col-span-2"
                            }`}
                          >
                            <div className="text-[11px] font-bold text-white mb-0.5">
                              {replaceVariables(f.name)}
                            </div>
                            <div className="text-[12px] text-[#dbdee1]">
                              {renderMarkdown(replaceVariables(f.value))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Banner Image */}
                    {config.welcome_image_url && (
                      <div className="mt-1 rounded-md overflow-hidden max-h-52 border border-white/5 bg-slate-900/60">
                        <img
                          src={replaceVariables(config.welcome_image_url)}
                          alt="Banner Preview"
                          className="w-full h-full object-cover"
                          onError={(e) => { e.currentTarget.style.display = "none"; }}
                        />
                      </div>
                    )}

                    {/* Footer */}
                    {(config.welcome_embed_footer || config.welcome_show_timestamp) && (
                      <div className="pt-2 border-t border-white/5 text-[11px] text-[#949ba4] flex items-center gap-1.5">
                        {config.welcome_embed_footer && (
                          <span>{replaceVariables(config.welcome_embed_footer)}</span>
                        )}
                        {config.welcome_embed_footer && config.welcome_show_timestamp && <span>•</span>}
                        {config.welcome_show_timestamp && <span>Today at 12:00 PM</span>}
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
                    className="mt-1.5 max-w-lg rounded-lg bg-[#2b2d31] border-l-4 p-4 shadow-md flex flex-col gap-2.5"
                    style={{ borderColor: config.leave_embed_color || "#F43F5E" }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        {config.leave_embed_title && (
                          <div className="font-bold text-white text-[15px] mb-1">
                            {replaceVariables(config.leave_embed_title)}
                          </div>
                        )}
                        <div className="text-[#dbdee1] text-[13px] leading-relaxed whitespace-pre-wrap">
                          {renderMarkdown(replaceVariables(config.leave_message))}
                        </div>
                      </div>

                      {config.leave_show_thumbnail && (
                        <div className="w-14 h-14 rounded-full overflow-hidden shrink-0 border border-white/10 shadow bg-slate-900/50">
                          <img
                            src={mockUser.avatar}
                            alt="Departed User"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                    </div>

                    {config.leave_image_url && (
                      <div className="mt-1 rounded-md overflow-hidden max-h-48 border border-white/5 bg-slate-900/60">
                        <img
                          src={replaceVariables(config.leave_image_url)}
                          alt="Leave Banner"
                          className="w-full h-full object-cover"
                          onError={(e) => { e.currentTarget.style.display = "none"; }}
                        />
                      </div>
                    )}

                    {config.leave_embed_footer && (
                      <div className="pt-2 border-t border-white/5 text-[11px] text-[#949ba4] flex items-center gap-1.5">
                        <span>{replaceVariables(config.leave_embed_footer)}</span>
                        <span>•</span>
                        <span>Today at 12:00 PM</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* TAB: Direct Message */}
            {activeTab === "dm" && (
              <div>
                {!config.dm_is_embed ? (
                  <div className="text-[#dbdee1] whitespace-pre-wrap text-[13px] leading-relaxed">
                    {renderMarkdown(replaceVariables(config.dm_message))}
                  </div>
                ) : (
                  <div
                    className="mt-1.5 max-w-lg rounded-lg bg-[#2b2d31] border-l-4 p-4 shadow-md flex flex-col gap-2.5"
                    style={{ borderColor: config.dm_embed_color || "#10B981" }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        {config.dm_embed_title && (
                          <div className="font-bold text-white text-[15px] mb-1">
                            {replaceVariables(config.dm_embed_title)}
                          </div>
                        )}
                        <div className="text-[#dbdee1] text-[13px] leading-relaxed whitespace-pre-wrap">
                          {renderMarkdown(replaceVariables(config.dm_message))}
                        </div>
                      </div>

                      {config.dm_show_thumbnail && (
                        <div className="w-14 h-14 rounded-full overflow-hidden shrink-0 border border-white/10 shadow bg-slate-900/50">
                          <img
                            src={serverIcon}
                            alt="Server Icon"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                    </div>

                    {config.dm_embed_footer && (
                      <div className="pt-2 border-t border-white/5 text-[11px] text-[#949ba4] flex items-center gap-1.5">
                        <span>{replaceVariables(config.dm_embed_footer)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
