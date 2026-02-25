from discord import Message
from db.db_helpers.sticky import sticky_step, update_last_message


async def handle_sticky(message: Message) -> bool:

    if message.author.bot:
        return False

    if message.guild is None:
        return False

    result = await sticky_step(
        guild_id=message.guild.id,
        channel_id=message.channel.id,
    )

    if not result:
        return False

    content, last_id = result

    # Delete old sticky if exists
    if last_id:
        try:
            old = await message.channel.fetch_message(last_id)
            if old.author.bot:
                await old.delete()
        except Exception:
            pass

    sent = await message.channel.send(content)

    await update_last_message(
        message.guild.id,
        message.channel.id,
        sent.id,
    )

    return True