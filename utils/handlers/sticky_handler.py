import asyncio
from discord import Message

from db.db_helpers.sticky import (
    get_sticky,
    increment_and_check,
    update_last_message,
)


async def handle_sticky(message: Message) -> None:
    # ── Ignore bots
    if message.author.bot:
        return

    # ── Guild-only safety
    if message.guild is None:
        return

    # ── Run DB logic off the event loop
    result = await asyncio.to_thread(
        _sticky_db_step,
        guild_id=message.guild.id,
        channel_id=message.channel.id,
    )

    if not result:
        return

    content, last_id = result

    # ── Delete previous sticky (if exists)
    if last_id:
        try:
            old = await message.channel.fetch_message(last_id)
            if old.author.bot:
                await old.delete()
        except Exception:
            pass

    # ── Send new sticky
    sent = await message.channel.send(content)

    # ── Update last message ID (DB, thread)
    await asyncio.to_thread(
        update_last_message,
        message.guild.id,
        message.channel.id,
        sent.id,
    )


# ─────────────────────────
# DB LOGIC (SYNC, THREAD)
# ─────────────────────────
def _sticky_db_step(*, guild_id: int, channel_id: int):
    content = get_sticky(guild_id, channel_id)
    if not content:
        return None

    repost, last_id = increment_and_check(guild_id, channel_id)
    if not repost:
        return None

    return content, last_id
