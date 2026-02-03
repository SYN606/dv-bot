import asyncio
import discord

from db.db_helpers.media_only import is_media_only


async def enforce_media_only(message: discord.Message) -> bool:
    """
    Enforces media-only channels.

    Returns True if the message was deleted
    and the pipeline should stop.
    """

    # ── Safety: guild-only
    if message.guild is None:
        return False

    # ── Allow ALL bot messages (stickies, system embeds, logs, etc.)
    if message.author.bot:
        return False

    # ── Check if channel is media-only (DB off event loop)
    media_only = await asyncio.to_thread(
        is_media_only,
        message.guild.id,
        message.channel.id,
    )

    if not media_only:
        return False

    # ── Detect media
    has_attachments = bool(message.attachments)
    has_embeds = bool(message.embeds)

    # ── No media → delete
    if not has_attachments and not has_embeds:
        try:
            await message.delete()
        except (discord.Forbidden, discord.NotFound):
            pass
        return True

    return False
