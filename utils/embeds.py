import discord
from typing import Iterable

# ─────────────────────────────────────
# Color palette (visible on dark mode)
# ─────────────────────────────────────
COLORS = {
    "INFO": 0x5865F2,  # Blurple
    "SUCCESS": 0x57F287,  # Green
    "WARNING": 0xFEE75C,  # Yellow
    "ERROR": 0xED4245,  # Red
    "DEBUG": 0x3498DB,  # Blue
    "SYSTEM": 0x9B59B6  # Purple
}

# ─────────────────────────────────────
# Custom animated emojis (support server)
# ─────────────────────────────────────
EMOJIS = {
    "INFO": "<a:anouncement:1359629824192282759>",
    "SUCCESS": "<a:okay:1359630397981331707>",
    "WARNING": "<a:red_dot:1359633914112774406>",
    "ERROR": "<a:fail:1359630009613947011>",
    "DEBUG": "<a:developer:1359626493713453199>",
    "SYSTEM": "<a:boost:1359631460398534796>",
}

# Fallback if emoji is not accessible
FALLBACK = {
    "INFO": "[INFO]",
    "SUCCESS": "[SUCCESS]",
    "WARNING": "[WARNING]",
    "ERROR": "[ERROR]",
    "DEBUG": "[DEBUG]",
    "SYSTEM": "[SYSTEM]",
}


def make_embed(*,
               title: str,
               description: str | None = None,
               level: str = "INFO",
               fields: Iterable[tuple[str, str, bool]] | None = None,
               author: str | None = None,
               footer: str | None = None,
               timestamp: bool = True) -> discord.Embed:
    """
    Standardized embed factory with custom support-server emojis.

    level: INFO | SUCCESS | WARNING | ERROR | DEBUG | SYSTEM
    """

    level = level.upper()
    color = COLORS.get(level, COLORS["INFO"])
    emoji = EMOJIS.get(level) or FALLBACK.get(level, "")

    embed = discord.Embed(title=f"{emoji} {title}",
                          description=description,
                          color=color)

    if author:
        embed.set_author(name=author)

    if fields:
        for name, value, inline in fields:
            embed.add_field(name=name, value=value, inline=inline)

    if footer:
        embed.set_footer(text=footer)

    if timestamp:
        embed.timestamp = discord.utils.utcnow()

    return embed
