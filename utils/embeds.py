import discord
from typing import Iterable

from utils.emojis import EMOJIS

# ─────────────────────────────────────
# Color palette (visible on dark mode)
# ─────────────────────────────────────
COLORS = {
    "INFO": 0x5865F2,
    "SUCCESS": 0x57F287,
    "WARNING": 0xFEE75C,
    "ERROR": 0xED4245,
    "DEBUG": 0x3498DB,
    "SYSTEM": 0x9B59B6,
}

# Emoji fallback if support-server emoji is unavailable
FALLBACK = {
    "INFO": "[INFO]",
    "SUCCESS": "[SUCCESS]",
    "WARNING": "[WARNING]",
    "ERROR": "[ERROR]",
    "DEBUG": "[DEBUG]",
    "SYSTEM": "[SYSTEM]",
}

# Alias support for semantic levels
LEVEL_ALIASES = {
    "OK": "SUCCESS",
    "FAIL": "ERROR",
    "WARN": "WARNING",
}


def _safe(text: str | None, limit: int) -> str | None:
    if not text:
        return None
    return text[:limit - 3] + "..." if len(text) > limit else text


def make_embed(
    *,
    title: str,
    description: str | None = None,
    level: str = "INFO",
    fields: Iterable[tuple[str, str, bool]] | None = None,
    author: str | None = None,
    footer: str | None = None,
    timestamp: bool = True,
    thumbnail: str | None = None,
) -> discord.Embed:
    """
    Standardized embed factory.

    level: INFO | SUCCESS | WARNING | ERROR | DEBUG | SYSTEM
    """

    level = LEVEL_ALIASES.get(level.upper(), level.upper())

    color = COLORS.get(level, COLORS["INFO"])
    emoji = EMOJIS.get(level.lower()) or FALLBACK.get(level, "")

    embed = discord.Embed(
        title=f"{emoji} {_safe(title, 256)}",
        description=_safe(description, 4096),
        color=color,
    )

    if author:
        embed.set_author(name=_safe(author, 256))

    if thumbnail:
        embed.set_thumbnail(url=thumbnail)

    if fields:
        for name, value, inline in fields:
            embed.add_field(
                name=_safe(name, 256),
                value=_safe(value, 1024),
                inline=inline,
            )

    if footer:
        embed.set_footer(text=_safe(footer, 2048))
    else:
        embed.set_footer(text="Digital Vigital")

    if timestamp:
        embed.timestamp = discord.utils.utcnow()

    return embed
