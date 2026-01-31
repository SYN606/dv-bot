from discord import Message
from db.db_helpers.sticky import (
    get_sticky,
    increment_and_check,
    update_last_message,
)


async def handle_sticky(message: Message):
    # ── Ignore bots completely (CRITICAL)
    if message.author.bot:
        return

    # ── Safety: guild-only
    if not message.guild:
        return

    content = get_sticky(
        message.guild.id,
        message.channel.id,
    )
    if not content:
        return

    repost, last_id = increment_and_check(
        message.guild.id,
        message.channel.id,
    )

    if not repost:
        return

    # ── Delete previous sticky (if exists)
    if last_id:
        try:
            old = await message.channel.fetch_message(last_id)
            # Extra safety: only delete bot messages
            if old.author.bot:
                await old.delete()
        except Exception:
            pass

    # ── Send new sticky
    sent = await message.channel.send(content)

    update_last_message(
        message.guild.id,
        message.channel.id,
        sent.id,
    )
