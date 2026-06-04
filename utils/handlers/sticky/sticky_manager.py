import asyncio
from typing import Optional
import discord

_STICKY_COOLDOWN: dict[int, float] = {}
_WEBHOOK_CACHE: dict[int, discord.Webhook] = {}
_CHANNEL_LOCKS: dict[int, asyncio.Lock] = {}
_DELETE_FAILSAFE: dict[int, float] = {}


class StickyPayload:

    def __init__(self,
                 *,
                 content: Optional[str] = None,
                 embed: Optional[discord.Embed] = None,
                 message_id: Optional[int] = None,
                 use_webhook: bool = False,
                 webhook_name: str = "Sticky"):

        self.content = content
        self.embed = embed
        self.message_id = message_id
        self.use_webhook = use_webhook
        self.webhook_name = webhook_name


async def get_or_create_webhook(channel: discord.TextChannel,
                                name: str) -> discord.Webhook:

    cached = _WEBHOOK_CACHE.get(channel.id)
    if cached:
        try:
            await cached.fetch()
            return cached
        except (discord.NotFound, discord.Forbidden, discord.HTTPException):
            _WEBHOOK_CACHE.pop(channel.id, None)

    try:
        webhooks = await channel.webhooks()

    except discord.HTTPException:
        raise RuntimeError("Failed to fetch webhooks.")

    for webhook in webhooks:
        if webhook.name == name:
            _WEBHOOK_CACHE[channel.id] = webhook
            return webhook
    webhook = await channel.create_webhook(name=name)
    _WEBHOOK_CACHE[channel.id] = webhook
    return webhook


async def delete_old_sticky(channel: discord.TextChannel,
                            message_id: int) -> None:

    now = asyncio.get_running_loop().time()
    last_delete = _DELETE_FAILSAFE.get(channel.id, 0)

    if now - last_delete < 1.5:
        return
    _DELETE_FAILSAFE[channel.id] = now

    try:
        partial = channel.get_partial_message(message_id)
        await partial.delete()
    except (discord.NotFound, discord.Forbidden, discord.HTTPException):
        pass


async def send_sticky(channel: discord.TextChannel,
                      payload: StickyPayload) -> Optional[discord.Message]:

    send_kwargs = {}
    if payload.content is not None:
        send_kwargs["content"] = payload.content
    if payload.embed is not None:
        send_kwargs["embed"] = payload.embed
    for _ in range(2):
        try:
            if payload.use_webhook:
                webhook = await get_or_create_webhook(channel,
                                                      payload.webhook_name)

                return await webhook.send(
                    username="Sticky",
                    avatar_url=(channel.guild.icon.url
                                if channel.guild.icon else None),
                    wait=True,
                    **send_kwargs)

            return await channel.send(
                allowed_mentions=discord.AllowedMentions.none(), **send_kwargs)

        except discord.NotFound:
            _WEBHOOK_CACHE.pop(channel.id, None)

        except discord.HTTPException:
            await asyncio.sleep(1)

        except discord.Forbidden:  # type: ignore
            return None
    return None


async def process_sticky(channel: discord.TextChannel,
                         payload: StickyPayload,
                         *,
                         cooldown: float = 8.0,
                         force: bool = False) -> Optional[int]:

    if (payload.content is None and payload.embed is None):
        return payload.message_id

    lock = _CHANNEL_LOCKS.setdefault(channel.id, asyncio.Lock())

    async with lock:
        now = asyncio.get_running_loop().time()
        last = _STICKY_COOLDOWN.get(channel.id, 0)

        # cooldown
        if (not force and now - last < cooldown):
            return payload.message_id
        _STICKY_COOLDOWN[channel.id] = now

        # prevent repost loop
        if (payload.message_id
                and payload.message_id == channel.last_message_id):
            return payload.message_id

        # delete previous sticky
        if payload.message_id:

            await delete_old_sticky(channel, payload.message_id)

        # send new sticky
        message = await send_sticky(channel, payload)

        if not message:
            return payload.message_id
        return message.id
