import discord
from discord import Message

from db.db_helpers.sticky import (
    sticky_step,
    update_last_message,
)

from .sticky_manager import (
    StickyPayload,
    process_sticky,
)


async def handle_sticky(message: Message) -> bool:

    # Basic guards
    if message.guild is None or message.author.bot:
        return False

    channel = message.channel
    if not isinstance(channel, discord.TextChannel):
        return False

    # Ignore commands (clean UX)
    if message.content.startswith(("!", "/", "dv ")):
        return False

    # ─────────────────────────
    # DB STEP (CORE LOGIC)
    # ─────────────────────────
    result = await sticky_step(
        guild_id=message.guild.id,
        channel_id=channel.id,
    )

    if not result:
        return False

    content, last_id = result

    # Prevent self-trigger (very important)
    if last_id and message.id == last_id:
        return False

    # ─────────────────────────
    # BUILD PAYLOAD
    # ─────────────────────────
    payload = StickyPayload(
        content=content,
        message_id=last_id,
    )

    # ─────────────────────────
    # PROCESS STICKY
    # ─────────────────────────
    new_id = await process_sticky(channel, payload)

    # ─────────────────────────
    # SAVE NEW MESSAGE ID
    # ─────────────────────────
    if new_id:
        await update_last_message(
            message.guild.id,
            channel.id,
            new_id,
        )

    return True
