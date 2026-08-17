from __future__ import annotations

from typing import Iterable, Optional
import discord

from utils.core.emojis import EMOJIS

# COLOR MAP
COLORS: dict[str, int] = {
    "INFO": 0x2B2D31,
    "SUCCESS": 0x1F8B4C,
    "WARNING": 0xF0B232,
    "ERROR": 0xDA373C,
    "DEBUG": 0x5865F2,
    "SYSTEM": 0x8E44AD,
}

# SEVERITY EMOJI MAP
SEVERITY_EMOJI_MAP: dict[str, str] = {
    "INFO": "announcement",
    "SUCCESS": "success",
    "WARNING": "warning",
    "ERROR": "fail",
    "DEBUG": "developer",
    "SYSTEM": "okay",
}

# DISCORD EMBED LIMITS
TITLE_LIMIT = 256
DESCRIPTION_LIMIT = 4096
FIELD_NAME_LIMIT = 256
FIELD_VALUE_LIMIT = 1024
FOOTER_LIMIT = 2048
AUTHOR_LIMIT = 256
MAX_FIELDS = 25


def _safe(text: Optional[str],
          limit: int,
          fallback: str = "\u200b") -> str | None:
    """Safely truncate text to Discord's character limit."""
    if text is None:
        return None

    text = text.strip()
    if not text:
        return fallback

    if len(text) <= limit:
        return text
    return text[:limit - 1] + "…"


def _safe_url(url: Optional[str]) -> Optional[str]:
    """Ensure the URL starts with http:// or https://."""
    if not url:
        return None
    if not (url.startswith("http://") or url.startswith("https://")):
        return None
    return url


def _resolve_color(level: str) -> int:
    """Resolve level string to hex color value."""
    return COLORS.get(level.upper(), COLORS["INFO"])


def _resolve_emoji(level: str) -> Optional[str]:
    """Resolve level string to emoji representation."""
    emoji_key = SEVERITY_EMOJI_MAP.get(level.upper())
    if not emoji_key:
        return None
    return EMOJIS.get(emoji_key)  # type: ignore


def make_embed(
    *,
    title: str,
    description: Optional[str] = None,
    level: str = "INFO",
    fields: Optional[Iterable[tuple[str, str, bool] | tuple[str, str]]] = None,
    author: Optional[str] = None,
    author_icon: Optional[str] = None,
    author_url: Optional[str] = None,
    thumbnail: Optional[str] = None,
    image: Optional[str] = None,
    footer: Optional[str] = None,
    footer_icon: Optional[str] = None,
    show_timestamp: bool = True,
    use_emoji: bool = False,
    url: Optional[str] = None,
) -> discord.Embed:
    """
    Factory function to construct standard discord.Embed objects with safety truncation,
    color-coded log levels, and automatic emoji prefixes.
    """
    level = level.upper()
    color = _resolve_color(level)

    emoji = _resolve_emoji(level) if use_emoji else None
    title_text = f"{emoji} {title}" if emoji else title

    embed = discord.Embed(
        title=_safe(title_text, TITLE_LIMIT),
        description=_safe(description, DESCRIPTION_LIMIT, fallback=""),
        color=color,
        url=_safe_url(url),
    )

    # Author
    if author:
        safe_author_name = _safe(author, AUTHOR_LIMIT, fallback="Unknown")
        if safe_author_name:
            embed.set_author(
                name=safe_author_name,
                icon_url=_safe_url(author_icon),
                url=_safe_url(author_url),
            )

    # Thumbnail & Image
    if safe_thumb := _safe_url(thumbnail):
        embed.set_thumbnail(url=safe_thumb)

    if safe_img := _safe_url(image):
        embed.set_image(url=safe_img)

    # Fields
    if fields:
        for index, field in enumerate(fields):
            if index >= MAX_FIELDS:
                break

            name = field[0]
            value = field[1]
            inline = field[2] if len(field) > 2 else False

            safe_name = _safe(name, FIELD_NAME_LIMIT)
            safe_value = _safe(value, FIELD_VALUE_LIMIT)

            if safe_name and safe_value:
                embed.add_field(name=safe_name,
                                value=safe_value,
                                inline=inline)

    # Footer
    if footer:
        embed.set_footer(
            text=_safe(footer, FOOTER_LIMIT),
            icon_url=_safe_url(footer_icon),
        )

    # Timestamp
    if show_timestamp:
        embed.timestamp = discord.utils.utcnow()

    return embed
