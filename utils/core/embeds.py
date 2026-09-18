from __future__ import annotations

from typing import Any, Iterable, Mapping, Optional, Union
import discord

from utils.core.emojis import EMOJIS

# COLOR PALETTE
COLORS: dict[str, int] = {
    "INFO": 0x2B2D31,       # Discord Charcoal / Dark
    "PRIMARY": 0x5865F2,    # Discord Blurple
    "SECONDARY": 0x4E5058,  # Slate Grey
    "SUCCESS": 0x57F287,    # Luminous Emerald
    "WARNING": 0xFEE75C,    # Amber Yellow
    "ERROR": 0xED4245,      # Vivid Crimson
    "DEBUG": 0x5865F2,      # Blurple
    "SYSTEM": 0x9B59B6,     # Royal Purple
    "MODERATION": 0xE67E22, # Warm Bronze
    "ANALYTICS": 0x00E5FF,  # Neon Aqua
}

# SEVERITY EMOJI MAP
SEVERITY_EMOJI_MAP: dict[str, str] = {
    "INFO": "announcement",
    "PRIMARY": "announcement",
    "SECONDARY": "developer",
    "SUCCESS": "success",
    "WARNING": "warning",
    "ERROR": "fail",
    "DEBUG": "developer",
    "SYSTEM": "okay",
    "MODERATION": "moderation",
    "ANALYTICS": "neonblue_arrow",
}

# DISCORD EMBED LIMITS
TITLE_LIMIT = 256
DESCRIPTION_LIMIT = 4096
FIELD_NAME_LIMIT = 256
FIELD_VALUE_LIMIT = 1024
FOOTER_LIMIT = 2048
AUTHOR_LIMIT = 256
MAX_FIELDS = 25
TOTAL_LIMIT = 6000

# VISUAL FORMATTING CONSTANTS
DIVIDER_LINE = "───────────────────────────────"


def _safe(
    text: Optional[str],
    limit: int,
    fallback: str = "\u200b",
) -> str | None:
    """Safely truncate text to Discord's character limit."""
    if text is None:
        return None

    text = str(text).strip()
    if not text:
        return fallback

    if len(text) <= limit:
        return text
    return text[: max(0, limit - 1)] + "…"


def _safe_url(url: Optional[str]) -> Optional[str]:
    """Ensure the URL starts with http:// or https://."""
    if not url:
        return None
    url_str = str(url).strip()
    if not (url_str.startswith("http://") or url_str.startswith("https://")):
        return None
    return url_str


def _resolve_color(
    level_or_color: Optional[Union[str, int, discord.Color]],
    default_level: str = "INFO",
) -> int:
    """Resolve color input (discord.Color, int hex, or level string) to an int hex value."""
    if isinstance(level_or_color, discord.Color):
        return level_or_color.value
    if isinstance(level_or_color, int):
        return level_or_color
    if isinstance(level_or_color, str):
        return COLORS.get(level_or_color.upper(), COLORS.get(default_level.upper(), COLORS["INFO"]))
    return COLORS.get(default_level.upper(), COLORS["INFO"])


def _resolve_emoji(level: str) -> Optional[str]:
    """Resolve level string to emoji representation."""
    emoji_key = SEVERITY_EMOJI_MAP.get(level.upper())
    if not emoji_key:
        return None
    return EMOJIS.get(emoji_key)  # type: ignore


class EmbedBuilder:
    """
    A fluent, chainable builder for constructing visually appealing, Discord-compliant embeds.
    """

    def __init__(
        self,
        title: Optional[str] = None,
        description: Optional[str] = None,
        *,
        level: str = "INFO",
        color: Optional[Union[int, discord.Color]] = None,
        url: Optional[str] = None,
        show_timestamp: bool = True,
        use_emoji: bool = False,
    ) -> None:
        self._title: Optional[str] = title
        self._description: Optional[str] = description
        self._level: str = level
        self._color: Optional[Union[int, discord.Color]] = color
        self._url: Optional[str] = url
        self._author_name: Optional[str] = None
        self._author_icon: Optional[str] = None
        self._author_url: Optional[str] = None
        self._thumbnail: Optional[str] = None
        self._image: Optional[str] = None
        self._footer_text: Optional[str] = None
        self._footer_icon: Optional[str] = None
        self._show_timestamp: bool = show_timestamp
        self._use_emoji: bool = use_emoji
        self._fields: list[tuple[str, str, bool]] = []

    def set_title(self, title: str, use_emoji: Optional[bool] = None) -> EmbedBuilder:
        self._title = title
        if use_emoji is not None:
            self._use_emoji = use_emoji
        return self

    def set_description(self, description: str) -> EmbedBuilder:
        self._description = description
        return self

    def append_description(self, text: str, separator: str = "\n") -> EmbedBuilder:
        if self._description:
            self._description = f"{self._description}{separator}{text}"
        else:
            self._description = text
        return self

    def set_level(self, level: str) -> EmbedBuilder:
        self._level = level
        return self

    def set_color(self, color: Union[int, discord.Color]) -> EmbedBuilder:
        self._color = color
        return self

    def set_author(
        self,
        name: str,
        icon_url: Optional[str] = None,
        url: Optional[str] = None,
    ) -> EmbedBuilder:
        self._author_name = name
        self._author_icon = icon_url
        self._author_url = url
        return self

    def set_footer(
        self,
        text: str,
        icon_url: Optional[str] = None,
    ) -> EmbedBuilder:
        self._footer_text = text
        self._footer_icon = icon_url
        return self

    def set_thumbnail(self, url: Optional[str]) -> EmbedBuilder:
        self._thumbnail = url
        return self

    def set_image(self, url: Optional[str]) -> EmbedBuilder:
        self._image = url
        return self

    def set_url(self, url: Optional[str]) -> EmbedBuilder:
        self._url = url
        return self

    def set_timestamp(self, show: bool = True) -> EmbedBuilder:
        self._show_timestamp = show
        return self

    def add_field(
        self,
        name: str,
        value: Any,
        inline: bool = False,
    ) -> EmbedBuilder:
        self._fields.append((str(name), str(value), inline))
        return self

    def add_fields(
        self,
        fields: Iterable[tuple[str, Any, bool] | tuple[str, Any]],
    ) -> EmbedBuilder:
        for f in fields:
            name = str(f[0])
            value = str(f[1])
            inline = bool(f[2]) if len(f) > 2 else False
            self._fields.append((name, value, inline))
        return self

    def add_key_value(
        self,
        key: str,
        value: Any,
        inline: bool = True,
    ) -> EmbedBuilder:
        """Add a structured key-value field formatted with bold header."""
        return self.add_field(name=f"**{key}**", value=str(value), inline=inline)

    def add_key_values(
        self,
        data: Mapping[str, Any] | Iterable[tuple[str, Any]],
        inline: bool = True,
    ) -> EmbedBuilder:
        """Add multiple structured key-value pairs."""
        items = data.items() if isinstance(data, Mapping) else data
        for k, v in items:
            self.add_key_value(k, v, inline=inline)
        return self

    def add_section(
        self,
        title: str,
        content: Any,
        inline: bool = False,
    ) -> EmbedBuilder:
        """Add a distinct section with formatted header."""
        return self.add_field(name=f"◈ {title}", value=str(content), inline=inline)

    def add_divider(self) -> EmbedBuilder:
        """Add a full-width visual divider between fields."""
        return self.add_field(name="\u200b", value=DIVIDER_LINE, inline=False)

    def build(self) -> discord.Embed:
        """Assemble and return the validated discord.Embed instance."""
        return make_embed(
            title=self._title or "\u200b",
            description=self._description,
            level=self._level,
            fields=self._fields,
            author=self._author_name,
            author_icon=self._author_icon,
            author_url=self._author_url,
            thumbnail=self._thumbnail,
            image=self._image,
            footer=self._footer_text,
            footer_icon=self._footer_icon,
            show_timestamp=self._show_timestamp,
            use_emoji=self._use_emoji,
            url=self._url,
            color=self._color,
        )


def make_embed(
    *,
    title: str,
    description: Optional[str] = None,
    level: str = "INFO",
    fields: Optional[Iterable[tuple[str, Any, bool] | tuple[str, Any]]] = None,
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
    color: Optional[Union[int, discord.Color]] = None,
) -> discord.Embed:
    """
    Factory function to construct standard discord.Embed objects with safety truncation,
    color-coded log levels, optional custom colors, and automatic emoji prefixes.
    """
    level = level.upper()
    resolved_color = _resolve_color(color if color is not None else level, default_level=level)

    emoji = _resolve_emoji(level) if use_emoji else None
    title_text = f"{emoji} {title}" if emoji else title

    embed = discord.Embed(
        title=_safe(title_text, TITLE_LIMIT),
        description=_safe(description, DESCRIPTION_LIMIT, fallback=""),
        color=resolved_color,
        url=_safe_url(url),
    )

    # Author
    if author:
        safe_author_name = _safe(
            author, min(AUTHOR_LIMIT, max(1, TOTAL_LIMIT - len(embed))), fallback="Unknown"
        )
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

    # Reserve footer space before adding fields; Discord also limits the sum
    # of all textual components, not just each component separately.
    if footer:
        remaining_for_footer = max(1, TOTAL_LIMIT - len(embed))
        embed.set_footer(
            text=_safe(footer, min(FOOTER_LIMIT, remaining_for_footer)),
            icon_url=_safe_url(footer_icon),
        )

    # Fields
    if fields:
        for index, field in enumerate(fields):
            if index >= MAX_FIELDS:
                break

            name = str(field[0]) if field[0] is not None else "\u200b"
            value = str(field[1]) if field[1] is not None else "\u200b"
            inline = bool(field[2]) if len(field) > 2 else False

            remaining = TOTAL_LIMIT - len(embed)
            if remaining < 2:
                break
            safe_name = _safe(name, min(FIELD_NAME_LIMIT, remaining - 1))
            safe_value = _safe(value, min(FIELD_VALUE_LIMIT, remaining - len(safe_name or "")))

            if safe_name and safe_value:
                embed.add_field(
                    name=safe_name,
                    value=safe_value,
                    inline=inline,
                )

    # Timestamp
    if show_timestamp:
        embed.timestamp = discord.utils.utcnow()

    return embed


def success_embed(
    title: str,
    description: Optional[str] = None,
    **kwargs: Any,
) -> discord.Embed:
    """Helper factory for styled success embeds."""
    use_emoji = kwargs.pop("use_emoji", True)
    return make_embed(title=title, description=description, level="SUCCESS", use_emoji=use_emoji, **kwargs)


def error_embed(
    title: str,
    description: Optional[str] = None,
    **kwargs: Any,
) -> discord.Embed:
    """Helper factory for styled error embeds."""
    use_emoji = kwargs.pop("use_emoji", True)
    return make_embed(title=title, description=description, level="ERROR", use_emoji=use_emoji, **kwargs)


def warning_embed(
    title: str,
    description: Optional[str] = None,
    **kwargs: Any,
) -> discord.Embed:
    """Helper factory for styled warning embeds."""
    use_emoji = kwargs.pop("use_emoji", True)
    return make_embed(title=title, description=description, level="WARNING", use_emoji=use_emoji, **kwargs)


def info_embed(
    title: str,
    description: Optional[str] = None,
    **kwargs: Any,
) -> discord.Embed:
    """Helper factory for styled informational embeds."""
    return make_embed(title=title, description=description, level="INFO", **kwargs)


def key_value_embed(
    title: str,
    data: Mapping[str, Any] | Iterable[tuple[str, Any]],
    *,
    description: Optional[str] = None,
    level: str = "INFO",
    inline: bool = True,
    **kwargs: Any,
) -> discord.Embed:
    """Helper factory for structured key-value data displays."""
    builder = EmbedBuilder(title=title, description=description, level=level, **kwargs)
    builder.add_key_values(data, inline=inline)
    return builder.build()


__all__ = [
    "COLORS",
    "SEVERITY_EMOJI_MAP",
    "TITLE_LIMIT",
    "DESCRIPTION_LIMIT",
    "FIELD_NAME_LIMIT",
    "FIELD_VALUE_LIMIT",
    "FOOTER_LIMIT",
    "AUTHOR_LIMIT",
    "MAX_FIELDS",
    "TOTAL_LIMIT",
    "DIVIDER_LINE",
    "EmbedBuilder",
    "make_embed",
    "success_embed",
    "error_embed",
    "warning_embed",
    "info_embed",
    "key_value_embed",
]
