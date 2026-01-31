from discord import Message
from db.db_helpers.sticky import (
    get_sticky,
    increment_and_check,
    update_last_message,
)


async def handle_sticky(message: Message):
    content = get_sticky(message.guild.id, message.channel.id) # type: ignore
    if not content:
        return

    repost, last_id = increment_and_check(
        message.guild.id, # type: ignore
        message.channel.id,
    )

    if not repost:
        return

    if last_id:
        try:
            old = await message.channel.fetch_message(last_id)
            await old.delete()
        except Exception:
            pass

    sent = await message.channel.send(content)
    update_last_message(
        message.guild.id, # type: ignore
        message.channel.id,
        sent.id,
    )
