import React, { useState } from "react";

function escapeHtml(text) {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function SpoilerText({ children }) {
  const [revealed, setRevealed] = useState(false);
  return (
    <span
      onClick={() => setRevealed(!revealed)}
      className={`inline-block px-1 py-0.5 rounded cursor-pointer transition-colors ${
        revealed
          ? "bg-slate-700/60 text-slate-200"
          : "bg-slate-800 text-transparent hover:bg-slate-700/80 select-none"
      }`}
      title="Click to reveal spoiler"
    >
      {children}
    </span>
  );
}

/**
 * Parses Discord Markdown text into React nodes safely
 */
export function renderDiscordMarkdown(content) {
  if (!content) return null;

  // Split lines to handle blockquotes and codeblocks
  const lines = String(content).split("\n");
  const resultNodes = [];

  let inCodeBlock = false;
  let codeBlockLines = [];

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];

    // Check codeblock toggle
    if (line.trim().startsWith("```")) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeBlockLines = [];
        continue;
      } else {
        inCodeBlock = false;
        resultNodes.push(
          <pre
            key={`cb-${lineIdx}`}
            className="my-1.5 p-2.5 rounded-lg bg-slate-950/80 border border-white/5 font-mono text-xs text-indigo-300 overflow-x-auto whitespace-pre leading-normal"
          >
            <code>{codeBlockLines.join("\n")}</code>
          </pre>
        );
        continue;
      }
    }

    if (inCodeBlock) {
      codeBlockLines.push(line);
      continue;
    }

    // Blockquote handling (supports single line '> ' and multiline '>>> ')
    const isMultiQuote = line.startsWith(">>> ");
    const isQuote = isMultiQuote || line.startsWith("> ");
    const textToParse = isMultiQuote ? line.slice(4) : (line.startsWith("> ") ? line.slice(2) : line);

    const parsedInline = parseInlineDiscordMarkdown(textToParse, lineIdx);

    if (isQuote) {
      resultNodes.push(
        <div
          key={`line-${lineIdx}`}
          className="flex gap-2 my-0.5 pl-2.5 border-l-4 border-slate-600 text-slate-300 italic"
        >
          <div>{parsedInline}</div>
        </div>
      );
    } else {
      resultNodes.push(
        <div key={`line-${lineIdx}`} className="min-h-[1.25rem] leading-relaxed break-words">
          {parsedInline}
        </div>
      );
    }
  }

  // Handle unclosed code block
  if (inCodeBlock && codeBlockLines.length > 0) {
    resultNodes.push(
      <pre
        key="cb-unclosed"
        className="my-1.5 p-2.5 rounded-lg bg-slate-950/80 border border-white/5 font-mono text-xs text-indigo-300 overflow-x-auto whitespace-pre leading-normal"
      >
        <code>{codeBlockLines.join("\n")}</code>
      </pre>
    );
  }

  return <div className="space-y-0.5">{resultNodes}</div>;
}

/**
 * Regex-based tokenizer for inline tokens
 */
function parseInlineDiscordMarkdown(text, keyPrefix) {
  if (!text) return " ";

  // Tokens regex:
  // 1: custom animated emoji <a:name:id>
  // 2: custom static emoji <:name:id>
  // 3: mention: user <@id>, channel <#id>, role <@&id>
  // 4: server mention @everyone, @here
  // 5: markdown link [title](url)
  // 6: inline code `code`
  // 7: bold **text**
  // 8: underline __text__
  // 9: strikethrough ~~text~~
  // 10: spoiler ||text||
  // 11: italic *text* or _text_

  const tokenRegex =
    /(<a?:[a-zA-Z0-9_]+:[0-9]+>|<@[!&]?[0-9]+>|<#[0-9]+>|(?:\b|\B)(\{(?:user:|channel:|role:|@|#|@&)?\d{16,22}\})|@everyone|@here|\[[^\]]+\]\(https?:\/\/[^\s)]+\)|`[^`]+`|\*\*[^*]+\*\*|__[^_]+__|~~[^~]+~~|\|\|[^|]+\|\||\*[^*]+\*|_[^_]+_)/g;

  const parts = text.split(tokenRegex);
  const elements = [];

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (!part) continue;

    const elKey = `${keyPrefix}-${i}`;

    // Custom Emoji
    const emojiMatch = part.match(/^<(a)?:([a-zA-Z0-9_]+):([0-9]+)>$/);
    if (emojiMatch) {
      const isAnimated = Boolean(emojiMatch[1]);
      const name = emojiMatch[2];
      const id = emojiMatch[3];
      const url = `https://cdn.discordapp.com/emojis/${id}.${isAnimated ? "gif" : "png"}`;
      elements.push(
        <img
          key={elKey}
          src={url}
          alt={`:${name}:`}
          title={`:${name}:`}
          onError={(e) => { e.currentTarget.style.display = "none"; }}
          className="inline-block w-5 h-5 mx-0.5 align-middle object-contain"
        />
      );
      continue;
    }

    // Server-wide Mentions (@everyone, @here)
    if (part === "@everyone" || part === "@here") {
      elements.push(
        <span
          key={elKey}
          className="inline-flex items-center px-1 py-0.2 rounded bg-[#5865F2]/20 text-[#c9cdfb] font-semibold hover:bg-[#5865F2]/30 transition-colors cursor-pointer text-xs align-baseline mx-0.5 select-all"
        >
          {part}
        </span>
      );
      continue;
    }

    // Bracket Mention Placeholders ({USER_ID}, {user:ID}, {channel:ID}, {#ID}, etc.)
    const bracketMatch = part.match(/^\{((?:user:|channel:|role:|@|#|@&)?(\d{16,22}))\}$/i);
    if (bracketMatch) {
      const tagLower = bracketMatch[1].toLowerCase();
      const snowflake = bracketMatch[2];
      const isChannel = tagLower.startsWith("channel:") || tagLower.startsWith("#");
      const isRole = tagLower.startsWith("role:") || tagLower.startsWith("@&");
      const prefix = isChannel ? "#" : "@";

      elements.push(
        <span
          key={elKey}
          title={isChannel ? `Channel ID: ${snowflake}` : isRole ? `Role ID: ${snowflake}` : `User ID: ${snowflake}`}
          className={`inline-flex items-center px-1.5 py-0.5 rounded font-medium transition-colors cursor-pointer text-xs align-baseline mx-0.5 select-all ${
            isChannel
              ? "bg-sky-500/20 text-sky-300 hover:bg-sky-500/30"
              : isRole
              ? "bg-purple-500/20 text-purple-300 hover:bg-purple-500/30"
              : "bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30"
          }`}
        >
          {prefix}{snowflake}
        </span>
      );
      continue;
    }

    // Member & Channel Mentions (<@123...>, <#123...>)
    if (part.startsWith("<@") || part.startsWith("<#")) {
      const isChannel = part.startsWith("<#");
      const isRole = part.startsWith("<@&");
      const cleanId = part.replace(/[<@#&!>]/g, "");
      const prefix = isChannel ? "#" : isRole ? "@" : "@";

      elements.push(
        <span
          key={elKey}
          className="inline-flex items-center px-1 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-medium hover:bg-indigo-500/30 transition-colors cursor-pointer text-xs align-baseline mx-0.5 select-all"
        >
          {prefix}{cleanId}
        </span>
      );
      continue;
    }

    // Markdown Link
    const linkMatch = part.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
    if (linkMatch) {
      elements.push(
        <a
          key={elKey}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sky-400 hover:underline hover:text-sky-300"
        >
          {linkMatch[1]}
        </a>
      );
      continue;
    }

    // Inline Code
    if (part.startsWith("`") && part.endsWith("`") && part.length >= 2) {
      elements.push(
        <code
          key={elKey}
          className="px-1.5 py-0.5 rounded bg-slate-900 border border-white/10 font-mono text-xs text-indigo-200"
        >
          {part.slice(1, -1)}
        </code>
      );
      continue;
    }

    // Bold
    if (part.startsWith("**") && part.endsWith("**") && part.length >= 4) {
      elements.push(
        <strong key={elKey} className="font-bold text-white">
          {parseInlineDiscordMarkdown(part.slice(2, -2), `${elKey}-b`)}
        </strong>
      );
      continue;
    }

    // Underline
    if (part.startsWith("__") && part.endsWith("__") && part.length >= 4) {
      elements.push(
        <u key={elKey} className="underline underline-offset-2">
          {parseInlineDiscordMarkdown(part.slice(2, -2), `${elKey}-u`)}
        </u>
      );
      continue;
    }

    // Strikethrough
    if (part.startsWith("~~") && part.endsWith("~~") && part.length >= 4) {
      elements.push(
        <s key={elKey} className="line-through text-slate-400">
          {parseInlineDiscordMarkdown(part.slice(2, -2), `${elKey}-s`)}
        </s>
      );
      continue;
    }

    // Spoiler
    if (part.startsWith("||") && part.endsWith("||") && part.length >= 4) {
      elements.push(
        <SpoilerText key={elKey}>
          {parseInlineDiscordMarkdown(part.slice(2, -2), `${elKey}-sp`)}
        </SpoilerText>
      );
      continue;
    }

    // Italic (* or _)
    if (
      (part.startsWith("*") && part.endsWith("*") && part.length >= 2) ||
      (part.startsWith("_") && part.endsWith("_") && part.length >= 2)
    ) {
      elements.push(
        <em key={elKey} className="italic text-slate-200">
          {parseInlineDiscordMarkdown(part.slice(1, -1), `${elKey}-i`)}
        </em>
      );
      continue;
    }

    // Plain text
    elements.push(<span key={elKey}>{part}</span>);
  }

  return elements;
}
