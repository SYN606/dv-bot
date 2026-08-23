from __future__ import annotations

import asyncio
import logging
import re
from typing import Optional

import discord

from ._webhook_utils import get_or_create_sticky_webhook

logger = logging.getLogger("bot")

_STICKY_COOLDOWN: dict[int, float] = {}
_CHANNEL_LOCKS: dict[int, asyncio.Lock] = {}

IMAGE_URL_REGEX = re.compile(
    r"(https?://\S+\.(?:png|jpg|jpeg|gif|webp)(?:\?\S+)?)", re.IGNORECASE)


class StickyPayload:

    def __init__(
        self,
        *,
        content: Optional[str] = None,
        embed: Optional[discord.Embed] = None,
        message_id: Optional[int] = None,
    ):
        self.content = content.strip() if content else ""
        self.embed = embed
        self.message_id = message_id


def build_sticky_embed(text_content: str) -> discord.Embed:
    """Constructs a sleek embed, extracting image URLs if present."""
    embed = discord.Embed(color=0x2B2D31)
    image_match = IMAGE_URL_REGEX.search(text_content)

    if image_match:
        image_url = image_match.group(1)
        embed.set_image(url=image_url)
        cleaned_text = text_content.replace(image_url, "").strip()
        embed.description = (cleaned_text
                             if cleaned_text else "📌 **Sticky Message**")
    else:
        embed.description = text_content

    return embed


async def delete_old_sticky(webhook: discord.Webhook, message_id: int) -> None:
    """Deletes an old sticky message through the webhook API."""
    try:
        await webhook.delete_message(message_id)
    except (discord.NotFound, discord.Forbidden, discord.HTTPException):
        pass


async def process_sticky(channel: discord.TextChannel,
                         payload: StickyPayload,
                         *,
                         cooldown: float = 3.0,
                         force: bool = False) -> Optional[int]:
    """Posts a sticky message via webhook and deletes the previous sticky message."""
    if not payload.content and not payload.embed:
        return payload.message_id

    lock = _CHANNEL_LOCKS.setdefault(channel.id, asyncio.Lock())

    async with lock:
        now = asyncio.get_running_loop().time()
        last_executed = _STICKY_COOLDOWN.get(channel.id, 0.0)

        # Enforce rate limit cooldown unless forced
        if not force and (now - last_executed < cooldown):
            return payload.message_id

        _STICKY_COOLDOWN[channel.id] = now

        # Prevent resending if the last message in the channel is already the sticky
        if (payload.message_id
                and payload.message_id == channel.last_message_id):
            return payload.message_id

        webhook = await get_or_create_sticky_webhook(channel)
        target_embed = (payload.embed if payload.embed else build_sticky_embed(
            payload.content))

        # Webhook Fallback: Send normal channel message if webhooks are unmanaged
        if not webhook:
            if payload.message_id:
                try:
                    msg = channel.get_partial_message(payload.message_id)
                    await msg.delete()
                except (discord.NotFound, discord.Forbidden,
                        discord.HTTPException):
                    pass
            try:
                msg = await channel.send(
                    embed=target_embed,
                    allowed_mentions=discord.AllowedMentions.none())
                return msg.id
            except (discord.Forbidden, discord.HTTPException):
                return payload.message_id

        # Delete previous sticky message using webhook
        if payload.message_id:
            await delete_old_sticky(webhook, payload.message_id)

        # Dispatch new sticky message via Webhook
        try:
            msg = await webhook.send(
                embed=target_embed,
                avatar_url=channel.guild.me.display_avatar.url,
                username=channel.guild.me.display_name,
                wait=True,
                allowed_mentions=discord.AllowedMentions.none())
            return msg.id
        except discord.HTTPException as exc:
            if exc.status == 429:  # Webhook Bucket Rate Limit Hit
                _STICKY_COOLDOWN[channel.id] = now + 5.0
            logger.error(
                "Failed to send sticky message via webhook in channel %s: %s",
                channel.id, exc)
            return payload.message_id
