import asyncio
import re
from typing import Optional
import discord

_STICKY_COOLDOWN: dict[int, float] = {}
_CHANNEL_LOCKS: dict[int, asyncio.Lock] = {}
_DELETE_FAILSAFE: dict[int, float] = {}

IMAGE_URL_REGEX = re.compile(
    r'(https?://\S+\.(?:png|jpg|jpeg|gif|webp)(?:\?\S+)?)', re.IGNORECASE)


class StickyPayload:

    def __init__(self,
                 *,
                 content: Optional[str] = None,
                 message_id: Optional[int] = None):
        self.content = content.strip() if content else ""
        self.message_id = message_id


def build_sticky_embed(text_content: str) -> discord.Embed:
    embed = discord.Embed(
        color=0x2b2d31)  # Sleek Discord dark-theme blend color

    image_match = IMAGE_URL_REGEX.search(text_content)

    if image_match:
        image_url = image_match.group(1)
        embed.set_image(url=image_url)
        # Clean the extracted image URL out of the main description layout string
        cleaned_text = text_content.replace(image_url, "").strip()
        embed.description = cleaned_text if cleaned_text else "📌 **Sticky Message**"
    else:
        embed.description = text_content

    return embed


async def delete_old_sticky(channel: discord.TextChannel,
                            message_id: int) -> None:
    now = asyncio.get_running_loop().time()
    last_delete = _DELETE_FAILSAFE.get(channel.id, 0.0)

    if now - last_delete < 2.0:
        return

    _DELETE_FAILSAFE[channel.id] = now

    try:
        partial = channel.get_partial_message(message_id)
        await partial.delete()
    except (discord.NotFound, discord.Forbidden, discord.HTTPException):
        pass


async def process_sticky(channel: discord.TextChannel,
                         payload: StickyPayload,
                         *,
                         cooldown: float = 4.5,
                         force: bool = False) -> Optional[int]:
    if not payload.content:
        return payload.message_id

    lock = _CHANNEL_LOCKS.setdefault(channel.id, asyncio.Lock())

    async with lock:
        now = asyncio.get_running_loop().time()
        last_executed = _STICKY_COOLDOWN.get(channel.id, 0.0)

        if not force and (now - last_executed < cooldown):
            return payload.message_id

        _STICKY_COOLDOWN[channel.id] = now

        if payload.message_id and payload.message_id == channel.last_message_id:
            return payload.message_id

        if payload.message_id:
            await delete_old_sticky(channel, payload.message_id)

        target_embed = build_sticky_embed(payload.content)

        try:
            new_msg = await channel.send(
                embed=target_embed,
                allowed_mentions=discord.AllowedMentions.none())
            return new_msg.id
        except discord.Forbidden:
            return None
        except discord.HTTPException as e:
            if e.status == 429:
                _STICKY_COOLDOWN[channel.id] = now + 5.0
            return payload.message_id
