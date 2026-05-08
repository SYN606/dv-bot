# sticky_handler.py

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

IGNORED_PREFIXES = (
    "!",
    "/",
    "dv ",
)


async def handle_sticky(message: Message, ) -> bool:

    # basic guards
    if message.guild is None:
        return False

    if message.author.bot:
        return False

    if message.webhook_id:
        return False

    if (message.type != discord.MessageType.default):

        return False

    channel = message.channel

    if not isinstance(
            channel,
            discord.TextChannel,
    ):

        return False

    # ignore commands
    if (message.content and message.content.startswith(IGNORED_PREFIXES)):

        return False

    # db sticky step
    result = await sticky_step(
        guild_id=message.guild.id,
        channel_id=channel.id,
    )

    if not result:
        return False

    content, last_id = result

    # prevent self trigger
    if (last_id and message.id == last_id):

        return False

    # build sticky payload
    payload = StickyPayload(
        content=content,
        message_id=last_id,
        use_webhook=False,
    )

    # process sticky
    new_id = await process_sticky(
        channel,
        payload,
    )

    # save latest sticky id
    if new_id:

        await update_last_message(
            guild_id=message.guild.id,
            channel_id=channel.id,
            message_id=new_id,
        )

    return True
