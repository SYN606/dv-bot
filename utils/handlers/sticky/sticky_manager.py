import discord
import asyncio
from typing import Optional

_STICKY_COOLDOWN: dict[int, float] = {}
_WEBHOOK_CACHE: dict[int, discord.Webhook] = {}


class StickyPayload:

    def __init__(
        self,
        *,
        content: Optional[str] = None,
        embed: Optional[discord.Embed] = None,
        message_id: Optional[int] = None,
        use_webhook: bool = False,
        webhook_name: str = "Sticky",
    ):
        self.content = content
        self.embed = embed
        self.message_id = message_id
        self.use_webhook = use_webhook
        self.webhook_name = webhook_name


# ─────────────────────────
# WEBHOOK
# ─────────────────────────
async def get_or_create_webhook(
    channel: discord.TextChannel,
    name: str,
) -> discord.Webhook:

    cached = _WEBHOOK_CACHE.get(channel.id)
    if cached:
        return cached

    webhooks = await channel.webhooks()

    for wh in webhooks:
        if wh.name == name:
            _WEBHOOK_CACHE[channel.id] = wh
            return wh

    webhook = await channel.create_webhook(name=name)
    _WEBHOOK_CACHE[channel.id] = webhook
    return webhook


# ─────────────────────────
# MAIN ENGINE (FIXED)
# ─────────────────────────
async def process_sticky(
        channel: discord.TextChannel,
        payload: StickyPayload,
        *,
        cooldown: float = 8.0,
        force: bool = False,  # 🔥 NEW
) -> Optional[int]:

    # Prevent invalid payload
    if payload.content is None and payload.embed is None:
        return payload.message_id

    now = asyncio.get_running_loop().time()
    last = _STICKY_COOLDOWN.get(channel.id, 0)

    # Cooldown check (skip if force)
    if not force and now - last < cooldown:
        return payload.message_id

    _STICKY_COOLDOWN[channel.id] = now

    old_message: Optional[discord.Message] = None
    webhook: Optional[discord.Webhook] = None

    # ─────────────────────────
    # FETCH OLD MESSAGE
    # ─────────────────────────
    if payload.message_id:
        try:
            if payload.use_webhook:
                webhook = await get_or_create_webhook(
                    channel,
                    payload.webhook_name,
                )
                old_message = await webhook.fetch_message(payload.message_id)
            else:
                old_message = await channel.fetch_message(payload.message_id)
        except (discord.NotFound, discord.Forbidden, discord.HTTPException):
            old_message = None

    # If sticky already last → skip
    if old_message and old_message.id == channel.last_message_id:
        return payload.message_id

    # ─────────────────────────
    # DELETE OLD
    # ─────────────────────────
    if old_message:
        try:
            await old_message.delete()
        except (discord.Forbidden, discord.HTTPException):
            pass

    # ─────────────────────────
    # BUILD SEND KWARGS
    # ─────────────────────────
    send_kwargs = {}

    if payload.content is not None:
        send_kwargs["content"] = payload.content

    if payload.embed is not None:
        send_kwargs["embed"] = payload.embed

    # ─────────────────────────
    # SEND NEW
    # ─────────────────────────
    try:
        if payload.use_webhook:
            if webhook is None:
                webhook = await get_or_create_webhook(
                    channel,
                    payload.webhook_name,
                )

            msg = await webhook.send(
                username="Sticky",
                avatar_url=channel.guild.icon.url
                if channel.guild.icon else None,
                wait=True,
                **send_kwargs,
            )
        else:
            msg = await channel.send(
                allowed_mentions=discord.AllowedMentions.none(),
                **send_kwargs,
            )

        return msg.id

    except discord.Forbidden:
        return payload.message_id
