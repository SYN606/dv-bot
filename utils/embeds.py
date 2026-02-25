import discord
from typing import Iterable, Optional

from utils.emojis import EMOJIS

# ============================================================
# region COLOR PALETTE (Dark Mode Optimised)
# ============================================================

COLORS: dict[str, int] = {
    "INFO": 0x2B2D31,  # Neutral dark
    "SUCCESS": 0x1F8B4C,  # Soft green
    "WARNING": 0xF0B232,  # Amber
    "ERROR": 0xDA373C,  # Soft red
    "DEBUG": 0x5865F2,  # Discord blurple
    "SYSTEM": 0x8E44AD,  # Muted purple
}

# endregion

# ============================================================
# region SEVERITY → EMOJI MAP
# ============================================================

SEVERITY_EMOJI_MAP = {
    "INFO": "announcement",
    "SUCCESS": "success",
    "WARNING": "warning",
    "ERROR": "fail",
    "DEBUG": "developer",
    "SYSTEM": "okay",
}

# endregion

# ============================================================
# region SAFETY UTIL
# ============================================================


def _safe(text: Optional[str], limit: int) -> Optional[str]:
    """
    Trims text safely to Discord limits.
    """
    if not text:
        return None

    if len(text) <= limit:
        return text

    return text[:limit - 1] + "…"


# endregion

# ============================================================
# region EMBED FACTORY (v3.0)
# ============================================================


def make_embed(
    *,
    title: str,
    description: Optional[str] = None,
    level: str = "INFO",
    fields: Optional[Iterable[tuple[str, str, bool]]] = None,
    author: Optional[str] = None,
    author_icon: Optional[str] = None,
    footer: Optional[str] = None,
    footer_icon: Optional[str] = None,
    thumbnail: Optional[str] = None,
    timestamp: bool = True,
    accent: bool = True,
    compact: bool = False,
    branded: bool = True,
) -> discord.Embed:
    """
    Modern embed factory.

    Features:
    - Severity-based color + emoji
    - Dark-mode optimised palette
    - Safe truncation
    - Compact mode support
    - Optional branding
    - Production-ready structure
    """

    level = level.upper()
    color = COLORS.get(level, COLORS["INFO"])

    # ─────────────────────────
    # Emoji Resolution
    # ─────────────────────────
    emoji_key = SEVERITY_EMOJI_MAP.get(level)
    emoji = EMOJIS.get(emoji_key) if emoji_key else None

    title_text = f"{emoji} {title}" if emoji else title

    # ─────────────────────────
    # Base Embed
    # ─────────────────────────
    embed = discord.Embed(
        title=_safe(title_text, 256),
        description=_safe(description, 4096),
        color=color if accent else None,
    )

    # ─────────────────────────
    # Author
    # ─────────────────────────
    if author:
        embed.set_author(
            name=_safe(author, 256),
            icon_url=author_icon,
        )

    # ─────────────────────────
    # Thumbnail
    # ─────────────────────────
    if thumbnail:
        embed.set_thumbnail(url=thumbnail)

    # ─────────────────────────
    # Fields (Max 25)
    # ─────────────────────────
    if fields:
        for name, value, inline in list(fields)[:25]:
            embed.add_field(
                name=_safe(name, 256),
                value=_safe(value, 1024),
                inline=inline,
            )

    # ─────────────────────────
    # Footer + Timestamp
    # ─────────────────────────
    if not compact:
        footer_parts: list[str] = []

        if footer:
            footer_parts.append(footer)

        if branded:
            footer_parts.append(f"Digital Vigital • {level}")

        if footer_parts:
            embed.set_footer(
                text=" • ".join(footer_parts),
                icon_url=footer_icon,
            )

        if timestamp:
            embed.timestamp = discord.utils.utcnow()

    return embed


# endregion
