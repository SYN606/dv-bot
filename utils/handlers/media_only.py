import asyncio
import discord
import re

from db.db_helpers.media_only import is_media_only
from utils.views.media_only_views import build_media_only_sticky_embed

STICKY_TAG = "MEDIA_ONLY_STICKY_NOTICE"

# Allow common media hosts (GIFs, embeds, previews)
MEDIA_LINK_REGEX = re.compile(
    r"(tenor\.com|giphy\.com|imgur\.com|cdn\.discordapp\.com)",
    re.IGNORECASE,
)


# ─────────────────────────────────────
# Media detection
# ─────────────────────────────────────
def is_valid_media(message: discord.Message) -> bool:
    # Attachments (images, videos, files)
    if message.attachments:
        return True

    # Discord embeds (image / video / gif)
    for embed in message.embeds:
        if embed.type in ("image", "video", "gifv", "rich"):
            return True

    # Known media links (Tenor, Giphy, etc.)
    if message.content and MEDIA_LINK_REGEX.search(message.content):
        return True

    return False


# ─────────────────────────────────────
# Sticky helpers
# ─────────────────────────────────────
async def remove_existing_sticky(channel: discord.TextChannel) -> None:
    """
    Remove the previous sticky message (if present).
    Only removes ONE message.
    """
    async for msg in channel.history(limit=20):
        if not msg.embeds:
            continue

        embed = msg.embeds[0]
        footer = embed.footer.text if embed.footer else ""

        if STICKY_TAG in footer:
            try:
                await msg.delete()
            except (discord.Forbidden, discord.NotFound):
                pass
            return


async def repost_sticky(channel: discord.TextChannel) -> None:
    """
    Ensures the sticky message is always the LAST message.
    """
    await remove_existing_sticky(channel)

    try:
        await channel.send(embed=build_media_only_sticky_embed())
    except discord.Forbidden:
        pass


# ─────────────────────────────────────
# MAIN ENFORCER
# ─────────────────────────────────────
async def enforce_media_only(message: discord.Message) -> bool:
    """
    v2 Media-only enforcement (STICKY MODE).

    Behavior:
    - Allows bots
    - Allows media (attachments, embeds, GIF links)
    - Deletes text-only messages
    - Re-posts sticky so it stays at bottom

    Returns True if message was deleted.
    """

    # ── Guild-only
    if message.guild is None:
        return False

    # ── Allow bot messages (including sticky itself)
    if message.author.bot:
        return False

    # ── Check DB (off event loop)
    media_only = await asyncio.to_thread(
        is_media_only,
        message.guild.id,
        message.channel.id,
    )

    if not media_only:
        return False

    channel = message.channel
    if not isinstance(channel, discord.TextChannel):
        return False

    # ── Wait briefly for embeds (IMPORTANT for GIFs)
    await asyncio.sleep(0.5)

    try:
        message = await channel.fetch_message(message.id)
    except (discord.NotFound, discord.Forbidden):
        return False

    # ── VALID MEDIA → allow + keep sticky at bottom
    if is_valid_media(message):
        await repost_sticky(channel)
        return False

    # ── INVALID (text-only) → delete + repost sticky
    try:
        await message.delete()
    except (discord.Forbidden, discord.NotFound):
        pass

    await repost_sticky(channel)
    return True
