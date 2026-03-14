import asyncio
import discord
from discord import Message

from db.db_helpers.sticky import (
    sticky_step,
    update_last_message,
)

# Cooldown per channel
_STICKY_COOLDOWN: dict[int, float] = {}
_STICKY_DELAY = 5


async def handle_sticky(message: Message) -> bool:

    if message.author.bot or message.guild is None:
        return False

    channel = message.channel
    if not isinstance(channel, discord.TextChannel):
        return False

    # Cooldown guard
    now = asyncio.get_running_loop().time()
    last = _STICKY_COOLDOWN.get(channel.id, 0)

    if now - last < _STICKY_DELAY:
        return False

    result = await sticky_step(
        guild_id=message.guild.id,
        channel_id=channel.id,
    )

    if not result:
        return False

    content, last_id = result

    _STICKY_COOLDOWN[channel.id] = now

    # Delete previous sticky safely
    if last_id:
        try:
            msg = channel.get_partial_message(last_id)
            await msg.delete()
        except (discord.NotFound, discord.Forbidden, discord.HTTPException):
            pass

    # Send new sticky
    try:
        sent = await channel.send(content)
    except discord.Forbidden:
        return False

    await update_last_message(
        message.guild.id,
        channel.id,
        sent.id,
    )

    return True
