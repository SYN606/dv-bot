import discord
from typing import Iterable, Optional
from utils.emojis import EMOJIS

# COLOR PALETTE (Refined)

COLORS: dict[str, int] = {
    "INFO": 0x2B2D31,
    "SUCCESS": 0x1F8B4C,
    "WARNING": 0xF0B232,
    "ERROR": 0xDA373C,
    "DEBUG": 0x5865F2,
    "SYSTEM": 0x8E44AD,
}

SEVERITY_EMOJI_MAP = {
    "INFO": "announcement",
    "SUCCESS": "success",
    "WARNING": "warning",
    "ERROR": "fail",
    "DEBUG": "developer",
    "SYSTEM": "okay",
}

# SAFETY


def _safe(text: Optional[str], limit: int) -> Optional[str]:
    if not text:
        return None
    return text if len(text) <= limit else text[:limit - 1] + "…"


# CLEAN EMBED FACTORY 


def make_embed(
    *,
    title: str,
    description: Optional[str] = None,
    level: str = "INFO",
    fields: Optional[Iterable[tuple[str, str, bool]]] = None,
    author: Optional[str] = None,
    author_icon: Optional[str] = None,
    thumbnail: Optional[str] = None,
    footer: Optional[str] = None,
    footer_icon: Optional[str] = None,
    show_timestamp: bool = True,
    use_emoji: bool = False,
) -> discord.Embed:
    """
    Minimal, visually clean embed factory.

    - No hard-coded branding
    - No level clutter in footer
    - Subtle severity colouring
    - Optional emoji (disabled by default)
    """

    level = level.upper()
    color = COLORS.get(level, COLORS["INFO"])

    # Optional subtle emoji
    emoji = None
    if use_emoji:
        emoji_key = SEVERITY_EMOJI_MAP.get(level)
        emoji = EMOJIS.get(emoji_key) if emoji_key else None

    title_text = f"{emoji} {title}" if emoji else title

    embed = discord.Embed(
        title=_safe(title_text, 256),
        description=_safe(description, 4096),
        color=color,
    )

    # Author
    if author:
        embed.set_author(
            name=_safe(author, 256),
            icon_url=author_icon,
        )

    # Thumbnail
    if thumbnail:
        embed.set_thumbnail(url=thumbnail)

    # Fields
    if fields:
        for name, value, inline in list(fields)[:25]:
            embed.add_field(
                name=_safe(name, 256),
                value=_safe(value, 1024),
                inline=inline,
            )

    # Footer (no branding injection)
    if footer:
        embed.set_footer(
            text=_safe(footer, 2048),
            icon_url=footer_icon,
        )

    if show_timestamp:
        embed.timestamp = discord.utils.utcnow()

    return embed
