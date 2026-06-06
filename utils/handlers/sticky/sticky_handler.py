import asyncio
import discord
from discord import Message
from db.db_helpers.sticky import (sticky_step, update_last_message)
from .sticky_manager import (StickyPayload, process_sticky)

IGNORED_PREFIXES = ("!", "/", "dv ")

_sticky_locks: dict[int, asyncio.Lock] = {}


async def handle_sticky(message: Message) -> bool:
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

    if last_id and message.id == last_id:
        return False

    if channel.id not in _sticky_locks:
        _sticky_locks[channel.id] = asyncio.Lock()

    async with _sticky_locks[channel.id]:
        if last_id:
            try:
                old_msg = await channel.fetch_message(last_id)
                await old_msg.delete()
            except (discord.NotFound, discord.Forbidden,
                    discord.HTTPException):
                pass  

        try:
            bot_id = message.guild.me.id
            async for old_msg in channel.history(limit=15):
                if old_msg.author.id == bot_id and len(
                        old_msg.embeds) > 0 and old_msg.id != last_id:
                    await old_msg.delete()
                    break
        except Exception:
            pass

        payload = StickyPayload(
            content=content,
            message_id=None)  
        new_id = await process_sticky(channel, payload)

        if new_id and new_id != last_id:
            await update_last_message(guild_id=message.guild.id,
                                      channel_id=channel.id,
                                      message_id=new_id)
            return True

    return False
