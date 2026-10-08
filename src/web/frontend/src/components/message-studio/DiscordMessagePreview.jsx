import React from "react";
import { CornerUpLeft, Clock, Paperclip, ExternalLink } from "lucide-react";
import { renderDiscordMarkdown } from "../../utils/discordMarkdown";
import { getDiscordAvatarUrl } from "../../utils/discord";

export default function DiscordMessagePreview({
  content = "",
  mode = "normal",
  embeds = [],
  attachments = [],
  replyData = null,
  botInfo = null,
  channelName = "general",
}) {
  const botAvatar = botInfo ? getDiscordAvatarUrl(botInfo) : "https://cdn.discordapp.com/embed/avatars/0.png";
  const botName = botInfo?.username || "Digital Vigital";

  const showContent = (mode === "normal" || mode === "hybrid") && content && content.trim().length > 0;
  const showEmbeds = (mode === "embed" || mode === "hybrid") && Array.isArray(embeds) && embeds.length > 0;
  const showAttachments = Array.isArray(attachments) && attachments.length > 0;

  const hasAnyDisplay = showContent || showEmbeds || showAttachments || (replyData && replyData.valid);

  return (
    <div className="flex flex-col h-full bg-[#1e1f22] text-[#dbdee1] rounded-2xl border border-white/5 overflow-hidden shadow-2xl select-text font-sans">
      {/* Discord Header Bar */}
      <div className="px-4 py-2.5 bg-[#2b2d31] border-b border-black/20 flex items-center justify-between text-xs text-[#949ba4] shrink-0">
        <div className="flex items-center gap-2 font-semibold truncate">
          <span className="text-slate-400 font-bold text-base leading-none">#</span>
          <span className="text-white truncate">{channelName || "channel-preview"}</span>
        </div>
        <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
          Live Client Preview
        </span>
      </div>

      {/* Discord Chat Area */}
      <div className="flex-1 p-4 overflow-y-auto space-y-2">
        {!hasAnyDisplay ? (
          <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center p-8 text-[#949ba4]">
            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-3 text-slate-500">
              <CornerUpLeft className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-300">Message Preview Empty</p>
            <p className="text-xs text-slate-500 max-w-xs mt-1">
              Start typing message content or customize an embed to see the live Discord client rendering here.
            </p>
          </div>
        ) : (
          <div className="group relative">
            {/* Reply Bar if enabled */}
            {replyData && replyData.valid && (
              <div className="flex items-center gap-1.5 text-xs text-[#b5bac1] mb-1 pl-7 relative select-none">
                <div className="absolute left-3 top-2.5 w-3.5 h-3 border-l-2 border-t-2 border-[#4e5058] rounded-tl-md pointer-events-none" />
                {replyData.author?.avatar ? (
                  <img
                    src={replyData.author.avatar}
                    alt=""
                    className="w-4 h-4 rounded-full object-cover shrink-0 ml-1"
                  />
                ) : (
                  <div className="w-4 h-4 rounded-full bg-slate-700 shrink-0 ml-1" />
                )}
                <span className="font-bold text-white hover:underline cursor-pointer">
                  @{replyData.author?.username || "RepliedUser"}
                </span>
                <span className="text-[#949ba4] truncate max-w-sm">
                  {replyData.contentSnippet || "Referenced message"}
                </span>
              </div>
            )}

            {/* Main Message Block */}
            <div className="flex gap-4">
              {/* Bot Avatar */}
              <div className="shrink-0 pt-0.5">
                <img
                  src={botAvatar}
                  alt={botName}
                  className="w-10 h-10 rounded-full object-cover bg-slate-800"
                />
              </div>

              {/* Message Content & Embeds */}
              <div className="flex-1 min-w-0">
                {/* Header row: Author Name + BOT badge + Timestamp */}
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="font-bold text-white text-[15px] hover:underline cursor-pointer">
                    {botName}
                  </span>
                  <span className="inline-flex items-center px-1.5 py-0.2 rounded bg-[#5865F2] text-[10px] font-extrabold text-white uppercase tracking-wider">
                    APP
                  </span>
                  <span className="text-[11px] text-[#949ba4] font-medium">
                    Today at {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>

                {/* Normal Text Content */}
                {showContent && (
                  <div className="text-[14.5px] text-[#dbdee1] break-words whitespace-pre-wrap leading-relaxed mb-2 font-normal">
                    {renderDiscordMarkdown(content)}
                  </div>
                )}

                {/* Embed Cards */}
                {showEmbeds && (
                  <div className="space-y-2 mt-2">
                    {embeds.map((embed, idx) => (
                      <DiscordEmbedCard key={idx} embed={embed} />
                    ))}
                  </div>
                )}

                {/* Attachments List */}
                {showAttachments && (
                  <div className="mt-2.5 space-y-2">
                    {attachments.map((att, aIdx) => {
                      const url = typeof att === "string" ? att : att?.url;
                      if (!url) return null;
                      const isImage = /\.(png|jpe?g|gif|webp)(\?.*)?$/i.test(url);
                      return isImage ? (
                        <div key={aIdx} className="rounded-lg overflow-hidden max-w-md border border-black/30">
                          <img
                            src={url}
                            alt="Attachment"
                            onError={(e) => { e.currentTarget.style.display = "none"; }}
                            className="max-h-80 w-auto object-contain rounded-lg"
                          />
                        </div>
                      ) : (
                        <div key={aIdx} className="inline-flex items-center gap-2 p-2 rounded-lg bg-[#2b2d31] border border-white/5 text-xs text-sky-400">
                          <Paperclip className="w-3.5 h-3.5" />
                          <a href={url} target="_blank" rel="noreferrer" className="hover:underline truncate max-w-xs">
                            {url}
                          </a>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Individual Discord Embed Card Renderer
 */
function DiscordEmbedCard({ embed }) {
  const colorHex = embed.color
    ? (typeof embed.color === "number"
        ? `#${embed.color.toString(16).padStart(6, "0")}`
        : String(embed.color).startsWith("#")
        ? embed.color
        : `#${embed.color}`)
    : "#202225";

  // Check if embed has any content
  const hasAuthor = Boolean(embed.author?.name);
  const hasTitle = Boolean(embed.title);
  const hasDescription = Boolean(embed.description);
  const hasFields = Array.isArray(embed.fields) && embed.fields.length > 0;
  const hasThumbnail = Boolean(embed.thumbnail?.url);
  const hasImage = Boolean(embed.image?.url);
  const hasFooter = Boolean(embed.footer?.text || embed.timestamp);

  if (!hasAuthor && !hasTitle && !hasDescription && !hasFields && !hasThumbnail && !hasImage && !hasFooter) {
    return null;
  }

  // Field grouping for Discord 3-column inline grid layout
  const fieldGroups = [];
  if (hasFields) {
    let currentInlineRow = [];
    embed.fields.forEach((field) => {
      if (!field.name && !field.value) return;
      if (field.inline) {
        currentInlineRow.push(field);
        if (currentInlineRow.length === 3) {
          fieldGroups.push({ isInline: true, items: currentInlineRow });
          currentInlineRow = [];
        }
      } else {
        if (currentInlineRow.length > 0) {
          fieldGroups.push({ isInline: true, items: currentInlineRow });
          currentInlineRow = [];
        }
        fieldGroups.push({ isInline: false, items: [field] });
      }
    });
    if (currentInlineRow.length > 0) {
      fieldGroups.push({ isInline: true, items: currentInlineRow });
    }
  }

  return (
    <div
      className="max-w-[520px] rounded-r-md bg-[#2b2d31] p-4 text-[13.5px] text-[#dbdee1] border-l-4 relative overflow-hidden shadow-md"
      style={{ borderLeftColor: colorHex }}
    >
      <div className="flex gap-4">
        {/* Left Column: Author, Title, Description, Fields, Image, Footer */}
        <div className="flex-1 min-w-0">
          {/* Author */}
          {hasAuthor && (
            <div className="flex items-center gap-2 mb-1.5 text-xs font-semibold text-white">
              {embed.author.icon_url && (
                <img
                  src={embed.author.icon_url}
                  alt=""
                  onError={(e) => { e.currentTarget.style.display = "none"; }}
                  className="w-5 h-5 rounded-full object-cover shrink-0"
                />
              )}
              {embed.author.url ? (
                <a
                  href={embed.author.url}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:underline text-white truncate"
                >
                  {embed.author.name}
                </a>
              ) : (
                <span className="truncate">{embed.author.name}</span>
              )}
            </div>
          )}

          {/* Title */}
          {hasTitle && (
            <div className="font-bold text-white text-[15px] mb-1.5 leading-snug">
              {embed.url ? (
                <a
                  href={embed.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sky-400 hover:underline inline-flex items-center gap-1"
                >
                  {embed.title}
                  <ExternalLink className="w-3 h-3 opacity-60" />
                </a>
              ) : (
                <span>{embed.title}</span>
              )}
            </div>
          )}

          {/* Description */}
          {hasDescription && (
            <div className="text-[13px] text-[#dbdee1] leading-relaxed break-words whitespace-pre-wrap mb-2">
              {renderDiscordMarkdown(embed.description)}
            </div>
          )}

          {/* Fields */}
          {fieldGroups.length > 0 && (
            <div className="my-2 space-y-2">
              {fieldGroups.map((group, gIdx) => (
                <div
                  key={gIdx}
                  className={`grid gap-2 ${
                    group.isInline
                      ? group.items.length === 1
                        ? "grid-cols-1"
                        : group.items.length === 2
                        ? "grid-cols-2"
                        : "grid-cols-3"
                      : "grid-cols-1"
                  }`}
                >
                  {group.items.map((field, fIdx) => (
                    <div key={fIdx} className="min-w-0">
                      <div className="text-[12px] font-bold text-white mb-0.5 truncate">
                        {field.name || "\u200B"}
                      </div>
                      <div className="text-[12.5px] text-[#dbdee1] leading-snug break-words">
                        {renderDiscordMarkdown(field.value || "\u200B")}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* Main Image */}
          {hasImage && (
            <div className="mt-3 rounded-lg overflow-hidden border border-black/20 max-w-full">
              <img
                src={embed.image.url}
                alt="Embed banner"
                onError={(e) => { e.currentTarget.style.display = "none"; }}
                className="w-full h-auto max-h-72 object-cover rounded-lg"
              />
            </div>
          )}

          {/* Footer & Timestamp */}
          {hasFooter && (
            <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center gap-2 text-[11px] text-[#949ba4] font-medium">
              {embed.footer?.icon_url && (
                <img
                  src={embed.footer.icon_url}
                  alt=""
                  onError={(e) => { e.currentTarget.style.display = "none"; }}
                  className="w-4 h-4 rounded-full object-cover shrink-0"
                />
              )}
              {embed.footer?.text && <span>{embed.footer.text}</span>}
              {embed.footer?.text && embed.timestamp && <span>•</span>}
              {embed.timestamp && (
                <span>
                  {embed.timestamp === "now" || embed.timestamp === true
                    ? "Today at " + new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                    : new Date(embed.timestamp).toLocaleDateString([], {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Thumbnail */}
        {hasThumbnail && (
          <div className="shrink-0 w-20 h-20 rounded-lg overflow-hidden border border-black/20">
            <img
              src={embed.thumbnail.url}
              alt="Thumbnail"
              onError={(e) => { e.currentTarget.style.display = "none"; }}
              className="w-full h-full object-cover"
            />
          </div>
        )}
      </div>
    </div>
  );
}
