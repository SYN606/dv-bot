import discord
import re
import asyncio
from collections import defaultdict
from typing import Dict, Tuple, Optional
from db.db_helpers.media_only import (get_media_only_config,
                                      update_sticky_message_id)
from utils.core.embeds import make_embed
from utils.logging.mod_log import send_mod_log
from .sticky.sticky_manager import StickyPayload, process_sticky

# CONFIGURATION CONSTANTS
STICKY_TAG = "MEDIA_ONLY_STICKY_NOTICE"
COMMAND_PREFIXES = ("!", ".", "/", "dv ")

# LOOSER REGEX: Captures media URLs anywhere inside the text, allowing descriptive captions
MEDIA_LINK_REGEX = re.compile(
    r"https?://\S+\.(png|jpg|jpeg|gif|webp|mp4|mov|webm)\b"
    r"|https?://(?:www\.)?(?:tenor|giphy|imgur)\.com/\S+", re.IGNORECASE)

# IN-MEMORY VIOLATION TRACKING
_violation_counter: Dict[Tuple[int, int], int] = defaultdict(int)


def build_media_only_sticky_embed() -> discord.Embed:
    """Generates the static informational panel using your custom embed component."""
    return make_embed(
        title="Media-Only Channel",
        description=("This channel allows **media only**.\n\n"
                     "• Text messages will be removed.\n"
                     "• Images, videos, GIFs, and files are allowed."),
        level="SYSTEM",
        use_emoji=True,
        footer=STICKY_TAG,
    )


def is_valid_media(message: discord.Message, *, image_only: bool) -> bool:
    """Checks native attachments, regex matches, and embeds for valid media signatures."""
    # 1. Native discord attachments check
    if message.attachments:
        if image_only:
            return any(a.content_type and a.content_type.startswith("image/ ")
                       for a in message.attachments)
        return True

    # 2. Text payload parsing (Counters the early embed generation race-condition)
    if message.content and MEDIA_LINK_REGEX.search(message.content):
        return True

    # 3. Post-render/cached embed check fallback
    for embed in message.embeds:
        if embed.type == "image":
            return True
        if not image_only and embed.type in ("video", "gifv"):
            return True

    return False


async def decay_violations(guild_id: int, user_id: int) -> None:
    """Gracefully decays infraction tallies; purges references to clean memory footprints."""
    await asyncio.sleep(300)
    key = (guild_id, user_id)
    if key in _violation_counter:
        _violation_counter[key] -= 1
        if _violation_counter[key] <= 0:
            _violation_counter.pop(key, None)


async def _refresh_sticky(channel: discord.TextChannel,
                          current_message_id: Optional[int]) -> None:
    """Internal helper to safely push sticky notifications through the processor."""
    payload = StickyPayload(embed=build_media_only_sticky_embed(),
                            message_id=current_message_id)
    new_id = await process_sticky(channel, payload, cooldown=10)
    if new_id:
        await update_sticky_message_id(channel.guild.id, channel.id, new_id)


async def enforce_media_only(message: discord.Message) -> bool:
    """Main enforcement hook processing incoming messages inside active system channels."""
    guild = message.guild
    if guild is None or message.author.system:
        return False

    channel = message.channel
    if not isinstance(channel, discord.TextChannel):
        return False

    config = await get_media_only_config(guild.id, channel.id)
    if not config:
        return False

    # Dynamic Bypasses
    if channel.is_nsfw() and config.nsfw_bypass:
        return False

    if config.whitelist_role_id and isinstance(message.author, discord.Member):
        if any(role.id == config.whitelist_role_id
               for role in message.author.roles):
            return False

    if message.content.startswith(COMMAND_PREFIXES):
        return False

    # Automated App/Bot Validation Handling
    if message.author.bot:
        if not is_valid_media(message, image_only=config.image_only):
            try:
                await message.delete()
            except (discord.Forbidden, discord.NotFound):
                pass
        return False

    # Action: Safe Media Match Passthrough
    if is_valid_media(message, image_only=config.image_only):
        await _refresh_sticky(channel, config.sticky_message_id)
        return False

    # Action: Violation Removal Processing
    try:
        await message.delete()
    except (discord.Forbidden, discord.NotFound):
        return False

    # Log & Track Infraction Aggregations
    key = (guild.id, message.author.id)
    _violation_counter[key] += 1
    asyncio.create_task(decay_violations(*key))

    # Trigger Disciplinary Auto-Muting Action
    if config.auto_mute and _violation_counter[key] >= 3:
        mute_role = discord.utils.get(guild.roles, name="Muted")
        if mute_role and isinstance(message.author, discord.Member):
            try:
                await message.author.add_roles(
                    mute_role, reason="Media-only channel layout violations")
            except discord.Forbidden:
                pass

    # Ship diagnostic output logs downstream
    try:
        await send_mod_log(
            guild=guild,
            category="MEDIA",
            title="Media-Only Violation",
            description=(f"User: {message.author.mention}\n"
                         f"Channel: {channel.mention}\n"
                         f"Violations: {_violation_counter[key]}"),
            level="WARNING",
            actor=message.author)
    except Exception:
        pass

    # Update sticky footer location positioning
    await _refresh_sticky(channel, config.sticky_message_id)
    return True
