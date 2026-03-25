import discord
import re
import asyncio
from collections import defaultdict
from typing import Dict, Tuple

from db.db_helpers.media_only import (
    get_media_only_config,
    update_sticky_message_id,
)
from utils.views.media_only_views import build_media_only_sticky_embed
from utils.logging.mod_log import send_mod_log

# IMPORT CENTRAL STICKY ENGINE
from .sticky.sticky_manager import StickyPayload, process_sticky


# ─────────────────────────────────────
# MEDIA REGEX
# ─────────────────────────────────────
MEDIA_LINK_REGEX = re.compile(
    r"^(https?:\/\/\S+\.(png|jpg|jpeg|gif|webp|mp4|mov|webm)"
    r"|https?:\/\/(tenor|giphy|imgur)\.com\/\S+)$",
    re.IGNORECASE,
)

_violation_counter: Dict[Tuple[int, int], int] = defaultdict(int)


# ─────────────────────────────────────
# MEDIA DETECTION
# ─────────────────────────────────────
def is_valid_media(message: discord.Message, *, image_only: bool) -> bool:

    if message.attachments:
        if image_only:
            return any(
                a.content_type and a.content_type.startswith("image/")
                for a in message.attachments
            )
        return True

    for embed in message.embeds:
        if embed.type == "image":
            return True
        if not image_only and embed.type in ("video", "gifv"):
            return True

    if message.content:
        content = message.content.strip()
        if MEDIA_LINK_REGEX.fullmatch(content):
            return True

    return False


# ─────────────────────────────────────
# VIOLATION DECAY
# ─────────────────────────────────────
async def decay_violations(guild_id: int, user_id: int):
    await asyncio.sleep(300)
    _violation_counter[(guild_id, user_id)] = max(
        0, _violation_counter[(guild_id, user_id)] - 1
    )


# ─────────────────────────────────────
# MAIN ENFORCER
# ─────────────────────────────────────
async def enforce_media_only(message: discord.Message) -> bool:

    guild = message.guild
    if guild is None:
        return False

    channel = message.channel
    if not isinstance(channel, discord.TextChannel):
        return False

    config = await get_media_only_config(guild.id, channel.id)
    if not config:
        return False

    # NSFW bypass
    if channel.is_nsfw() and config.nsfw_bypass:
        return False

    # Whitelist role
    if config.whitelist_role_id:
        if isinstance(message.author, discord.Member):
            if any(role.id == config.whitelist_role_id for role in message.author.roles):
                return False

    # Allow commands
    if message.content.startswith(("!", ".", "/", "dv ")):
        return False

    # BOT handling
    if message.author.bot:
        if not is_valid_media(message, image_only=config.image_only):
            try:
                await message.delete()
            except Exception:
                pass
        return False

    # ─────────────────────────
    # VALID MEDIA
    # ─────────────────────────
    if is_valid_media(message, image_only=config.image_only):

        payload = StickyPayload(
            embed=build_media_only_sticky_embed(),
            message_id=config.sticky_message_id,
            use_webhook=True,
            webhook_name="MediaOnlySticky",
        )

        new_id = await process_sticky(channel, payload, cooldown=10)

        if new_id:
            await update_sticky_message_id(
                guild.id,
                channel.id,
                new_id,
            )

        return False

    # ─────────────────────────
    # INVALID → DELETE
    # ─────────────────────────
    try:
        await message.delete()
    except (discord.Forbidden, discord.NotFound):
        return False

    # TRACK VIOLATIONS
    key = (guild.id, message.author.id)
    _violation_counter[key] += 1

    asyncio.create_task(decay_violations(*key))

    # AUTO MUTE
    if config.auto_mute and _violation_counter[key] >= 3:
        mute_role = discord.utils.get(guild.roles, name="Muted")
        if mute_role and isinstance(message.author, discord.Member):
            try:
                await message.author.add_roles(
                    mute_role,
                    reason="Media-only violations",
                )
            except discord.Forbidden:
                pass

    # LOGGING
    try:
        await send_mod_log(
            guild=guild,
            category="MEDIA",
            title="Media-Only Violation",
            description=(
                f"User: {message.author.mention}\n"
                f"Channel: {channel.mention}\n"
                f"Violations: {_violation_counter[key]}"
            ),
            level="WARNING",
            actor=message.author,
        )
    except Exception:
        pass

    # ─────────────────────────
    # UPDATE STICKY AFTER VIOLATION
    # ─────────────────────────
    payload = StickyPayload(
        embed=build_media_only_sticky_embed(),
        message_id=config.sticky_message_id,
        use_webhook=True,
        webhook_name="MediaOnlySticky",
    )

    new_id = await process_sticky(channel, payload, cooldown=10)

    if new_id:
        await update_sticky_message_id(
            guild.id,
            channel.id,
            new_id,
        )

    return True