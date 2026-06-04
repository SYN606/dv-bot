from __future__ import annotations

from typing import Iterable
from typing import Optional

import discord

from utils.core.emojis import EMOJIS

# COLORS

COLORS: dict[str, int] = {
    "INFO": 0x2B2D31,
    "SUCCESS": 0x1F8B4C,
    "WARNING": 0xF0B232,
    "ERROR": 0xDA373C,
    "DEBUG": 0x5865F2,
    "SYSTEM": 0x8E44AD,
}

# EMOJI MAP

SEVERITY_EMOJI_MAP: dict[str, str] = {
    "INFO": "announcement",
    "SUCCESS": "success",
    "WARNING": "warning",
    "ERROR": "fail",
    "DEBUG": "developer",
    "SYSTEM": "okay",
}

# LIMITS

TITLE_LIMIT = 256

DESCRIPTION_LIMIT = 4096

FIELD_NAME_LIMIT = 256

FIELD_VALUE_LIMIT = 1024

FOOTER_LIMIT = 2048

AUTHOR_LIMIT = 256

MAX_FIELDS = 25

# SAFE TEXT


def _safe(
    text: Optional[str],
    limit: int,
) -> Optional[str]:

    if not text:
        return None

    if len(text) <= limit:
        return text

    return (text[:limit - 1] + "…")


# SAFE URL


def _safe_url(url: Optional[str], ) -> Optional[str]:

    if not url:
        return None

    if not (url.startswith("http://") or url.startswith("https://")):

        return None

    return url


# RESOLVE COLOR


def _resolve_color(level: str, ) -> int:

    return COLORS.get(
        level,
        COLORS["INFO"],
    )


# RESOLVE EMOJI


def _resolve_emoji(level: str, ) -> Optional[str]:

    emoji_key = (SEVERITY_EMOJI_MAP.get(level))

    if not emoji_key:
        return None

    return EMOJIS.get(emoji_key) # type: ignore


# BUILD TITLE


def _build_title(
    title: str,
    emoji: Optional[str],
) -> str:

    if not emoji:
        return title

    return (f"{emoji} "
            f"{title}")


# EMBED FACTORY
def make_embed(
    *,
    title: str,
    description: Optional[str] = None,
    level: str = "INFO",
    fields: Optional[Iterable[tuple[
        str,
        str,
        bool,
    ]]] = None,
    author: Optional[str] = None,
    author_icon: Optional[str] = None,
    thumbnail: Optional[str] = None,
    image: Optional[str] = None,
    footer: Optional[str] = None,
    footer_icon: Optional[str] = None,
    show_timestamp: bool = True,
    use_emoji: bool = False,
    url: Optional[str] = None,
) -> discord.Embed:

    level = level.upper()

    color = _resolve_color(level)

    emoji = None

    if use_emoji:

        emoji = _resolve_emoji(level)

    title_text = _build_title(
        title,
        emoji,
    )

    embed = discord.Embed(
        title=_safe(
            title_text,
            TITLE_LIMIT,
        ),
        description=_safe(
            description,
            DESCRIPTION_LIMIT,
        ),
        color=color,
        url=_safe_url(url),
    )

    # author
    if author:

        embed.set_author(
            name=_safe(
                author,
                AUTHOR_LIMIT,
            ),
            icon_url=_safe_url(author_icon),
        )

    # thumbnail
    safe_thumbnail = _safe_url(thumbnail)

    if safe_thumbnail:

        embed.set_thumbnail(url=safe_thumbnail)

    # image
    safe_image = _safe_url(image)

    if safe_image:

        embed.set_image(url=safe_image)

    # fields
    if fields:

        for index, (
                name,
                value,
                inline,
        ) in enumerate(fields):

            if index >= MAX_FIELDS:
                break

            safe_name = _safe(
                name,
                FIELD_NAME_LIMIT,
            )

            safe_value = _safe(
                value,
                FIELD_VALUE_LIMIT,
            )

            if (not safe_name or not safe_value):

                continue

            embed.add_field(
                name=safe_name,
                value=safe_value,
                inline=inline,
            )

    # footer
    if footer:

        embed.set_footer(
            text=_safe(
                footer,
                FOOTER_LIMIT,
            ),
            icon_url=_safe_url(footer_icon),
        )

    # timestamp
    if show_timestamp:

        embed.timestamp = (discord.utils.utcnow())

    return embed
