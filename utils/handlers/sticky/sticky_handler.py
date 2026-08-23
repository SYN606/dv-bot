from __future__ import annotations

import discord
from discord import Message

from db.db_helpers.sticky import sticky_step, update_last_message
from utils.handlers.sticky._sticky_manager import StickyPayload, process_sticky

IGNORED_PREFIXES = ("!", "/", "dv ")


async def handle_sticky(message: Message) -> bool:
    """Evaluates incoming messages and repositions the sticky message at the bottom."""
    if (message.guild is None or message.author.bot or message.webhook_id
            or message.type != discord.MessageType.default):
        return False

    channel = message.channel
    if not isinstance(channel, discord.TextChannel):
        return False

    if message.content and message.content.startswith(IGNORED_PREFIXES):
        return False

    result = await sticky_step(guild_id=message.guild.id,
                               channel_id=channel.id)
    if not result:
        return False

    content, last_id = result

    # Fast return if user replied to or sent on top of the same ID
    if last_id and message.id == last_id:
        return False

    payload = StickyPayload(content=content, message_id=last_id)
    new_id = await process_sticky(channel, payload)

    if new_id and new_id != last_id:
        await update_last_message(
            guild_id=message.guild.id,
            channel_id=channel.id,
            message_id=new_id,
        )
        return True

    return False
