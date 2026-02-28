import discord
import re
import asyncio
from collections import defaultdict

from db.db_helpers.media_only import (
    get_media_only_config,
    update_sticky_message_id,
)
from utils.views.media_only_views import build_media_only_sticky_embed
from utils.logging.mod_log import send_mod_log  

MEDIA_LINK_REGEX = re.compile(
    r"(tenor\.com|giphy\.com|imgur\.com|cdn\.discordapp\.com|"
    r"\.(png|jpg|jpeg|gif|webp|mp4|mov|webm))",
    re.IGNORECASE,
)

# Sticky cooldown (per channel)
_last_sticky: dict[int, float] = {}

# Violation counter (guild_id, user_id)
_violation_counter: dict[tuple[int, int], int] = defaultdict(int)

# Flood tracker (channel_id)
_flood_tracker: dict[int, list[float]] = defaultdict(list)


# ─────────────────────────────────────
# Media detection (config aware)
# ─────────────────────────────────────
def is_valid_media(message: discord.Message, *, image_only: bool) -> bool:

    # Attachments
    if message.attachments:
        if image_only:
            return any(a.content_type and a.content_type.startswith("image/")
                       for a in message.attachments)
        return True

    # Embeds
    for embed in message.embeds:
        if embed.type == "image":
            return True
        if not image_only and embed.type in ("video", "gifv"):
            return True

    # Direct media links
    if message.content and MEDIA_LINK_REGEX.search(message.content):
        return True

    return False


# ─────────────────────────────────────
# Webhook Sticky System
# ─────────────────────────────────────
async def get_or_create_webhook(channel: discord.TextChannel):
    webhooks = await channel.webhooks()
    for wh in webhooks:
        if wh.name == "MediaOnlySticky":
            return wh
    return await channel.create_webhook(name="MediaOnlySticky")


async def repost_sticky(channel: discord.TextChannel, config):
    now = asyncio.get_event_loop().time()
    last = _last_sticky.get(channel.id, 0)

    if now - last < 5:
        return

    _last_sticky[channel.id] = now

    try:
        webhook = await get_or_create_webhook(channel)
    except discord.Forbidden:
        return

    # Delete previous sticky via webhook
    if config.sticky_message_id:
        try:
            await webhook.delete_message(config.sticky_message_id)
        except Exception:
            pass

    try:
        msg = await webhook.send(
            embed=build_media_only_sticky_embed(),
            username="Media Only",
            avatar_url=channel.guild.icon.url if channel.guild.icon else None,
            wait=True,
        )

        await update_sticky_message_id(
            channel.guild.id,
            channel.id,
            msg.id,
        )
    except discord.Forbidden:
        pass


# ─────────────────────────────────────
# Anti-Raid Flood Guard
# ─────────────────────────────────────
def flood_protected(channel_id: int) -> bool:
    now = asyncio.get_event_loop().time()
    timestamps = _flood_tracker[channel_id]
    timestamps = [t for t in timestamps if now - t < 5]
    timestamps.append(now)
    _flood_tracker[channel_id] = timestamps

    return len(timestamps) > 12  # disable if spammed


# ─────────────────────────────────────
# MAIN ENFORCER
# ─────────────────────────────────────
async def enforce_media_only(message: discord.Message) -> bool:

    if message.guild is None or message.author.bot:
        return False

    channel = message.channel
    if not isinstance(channel, discord.TextChannel):
        return False

    config = await get_media_only_config(
        message.guild.id,
        message.channel.id,
    )

    if not config:
        return False

    # NSFW bypass
    if channel.is_nsfw() and config.nsfw_bypass:
        return False

    # Whitelist role
    if config.whitelist_role_id:
        if any(role.id == config.whitelist_role_id
               for role in message.author.roles):
            return False

    # Anti-raid flood guard
    if flood_protected(channel.id):
        return False

    # Small embed generation delay
    await asyncio.sleep(0.4)

    # VALID MEDIA
    if is_valid_media(message, image_only=config.image_only):
        await repost_sticky(channel, config)
        return False

    # INVALID MESSAGE
    try:
        await message.delete()
    except (discord.Forbidden, discord.NotFound):
        return False

    # Track violations
    key = (message.guild.id, message.author.id)
    _violation_counter[key] += 1

    # Auto-mute logic
    if config.auto_mute and _violation_counter[key] >= 3:
        mute_role = discord.utils.get(message.guild.roles, name="Muted")
        if mute_role:
            try:
                await message.author.add_roles(
                    mute_role,
                    reason="Repeated media-only violations",
                )
            except discord.Forbidden:
                pass

    # Optional logging
    try:
        await send_mod_log(
            guild=message.guild,
            title="Media-Only Violation",
            description=(f"User: {message.author.mention}\n"
                         f"Channel: {channel.mention}\n"
                         f"Violation count: {_violation_counter[key]}"),
            level="WARNING",
            actor=message.author,
        )
    except Exception:
        pass

    await repost_sticky(channel, config)
    return True
