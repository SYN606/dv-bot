import discord
from typing import Iterable, Optional

from utils.emojis import EMOJIS

# ─────────────────────────────────────
# Modern dark-mode palette
# ─────────────────────────────────────
COLORS: dict[str, int] = {
    "INFO": 0x2B2D31,  # Neutral dark
    "SUCCESS": 0x1F8B4C,  # Soft green
    "WARNING": 0xF0B232,  # Amber
    "ERROR": 0xDA373C,  # Soft red
    "DEBUG": 0x5865F2,  # Discord blurple
    "SYSTEM": 0x8E44AD,  # Muted purple
}


# ─────────────────────────────────────
# Helpers
# ─────────────────────────────────────
def _safe(text: Optional[str], limit: int) -> Optional[str]:
    """
    Trim text safely to Discord limits.
    """
    if not text:
        return None
    if len(text) <= limit:
        return text
    return text[:limit - 1] + "…"


# ─────────────────────────────────────
# Embed Factory (v2.2)
# ─────────────────────────────────────
def make_embed(
    *,
    title: str,
    description: Optional[str] = None,
    level: str = "INFO",
    fields: Optional[Iterable[tuple[str, str, bool]]] = None,
    author: Optional[str] = None,
    footer: Optional[str] = None,
    timestamp: bool = True,
    thumbnail: Optional[str] = None,
    accent: bool = True,
) -> discord.Embed:
    """
    Modern embed factory.

    - Explicit severity levels only
    - Dark-mode optimized
    - Safe for dynamic updates
    """

    level = level.upper()
    color = COLORS.get(level, COLORS["INFO"])

    emoji = EMOJIS.get(level.lower())
    title_text = f"{emoji} {title}" if emoji else title

    embed = discord.Embed(
        title=_safe(title_text, 256),
        description=_safe(description, 4096),
        color=color if accent else None,
    )

    # ── Author (top-left)
    if author:
        embed.set_author(name=_safe(author, 256))

    # ── Thumbnail (right)
    if thumbnail:
        embed.set_thumbnail(url=thumbnail)

    # ── Fields
    if fields:
        for name, value, inline in fields:
            embed.add_field(
                name=_safe(name, 256),
                value=_safe(value, 1024),
                inline=inline,
            )

    # ── Footer
    footer_parts: list[str] = []
    if footer:
        footer_parts.append(footer)
    footer_parts.append(f"Digital Vigital • {level}")

    embed.set_footer(text=" • ".join(footer_parts))

    if timestamp:
        embed.timestamp = discord.utils.utcnow()

    return embed
