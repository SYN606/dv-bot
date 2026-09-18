from __future__ import annotations

import asyncio
import logging
import time
from typing import Dict, Optional, Tuple

import discord

from db.db_helpers.afk import (
    get_afk,
    get_afk_records_for_users,
    is_user_afk_cached,
    remove_afk,
)
from utils.core.embeds import make_embed

logger = logging.getLogger("DigitalVigital")
AFK_PREFIX = "[AFK] "

# Direct Message notification cooldown cache: {user_id: last_dm_timestamp}
_DM_COOLDOWN_CACHE: Dict[int, float] = {}
DM_COOLDOWN_SECONDS = 60.0

# Channel notification cooldown cache: {(channel_id, user_id): last_notice_timestamp}
_CHANNEL_NOTICE_CACHE: Dict[Tuple[int, int], float] = {}
CHANNEL_NOTICE_COOLDOWN_SECONDS = 30.0

_MAX_CACHE_SIZE = 2000


def _prune_caches(now: float) -> None:
    """Prunes expired items from in-memory notice caches to avoid unbounded growth."""
    global _DM_COOLDOWN_CACHE, _CHANNEL_NOTICE_CACHE
    if len(_DM_COOLDOWN_CACHE) > _MAX_CACHE_SIZE:
        cutoff = now - DM_COOLDOWN_SECONDS
        _DM_COOLDOWN_CACHE = {k: v for k, v in _DM_COOLDOWN_CACHE.items() if v >= cutoff}
    if len(_CHANNEL_NOTICE_CACHE) > _MAX_CACHE_SIZE:
        cutoff = now - CHANNEL_NOTICE_COOLDOWN_SECONDS
        _CHANNEL_NOTICE_CACHE = {k: v for k, v in _CHANNEL_NOTICE_CACHE.items() if v >= cutoff}


# --- NICKNAME HELPERS ---
async def apply_afk_nicknames(
    bot: discord.Client,
    user_id: int,
    is_global: bool,
    current_guild: discord.Guild,
) -> None:
    """Applies the AFK nickname prefix locally or across all shared guilds with pacing."""
    guilds = list(bot.guilds) if is_global else [current_guild]

    for i, guild in enumerate(guilds):
        member = guild.get_member(user_id)
        if not member or not guild.me.guild_permissions.manage_nicknames:
            continue
        if member.top_role >= guild.me.top_role or member.id == guild.owner_id:
            continue

        if not member.display_name.startswith(AFK_PREFIX):
            new_name = f"{AFK_PREFIX}{member.display_name}"[:32]
            try:
                await member.edit(nick=new_name)
            except (discord.Forbidden, discord.HTTPException) as exc:
                logger.debug(
                    "Failed to set AFK nick for %s in %s: %s",
                    member,
                    guild.name,
                    exc,
                )
            if is_global and i < len(guilds) - 1:
                await asyncio.sleep(0.5)


async def restore_afk_nicknames(
    bot: discord.Client,
    user_id: int,
    original_nick: Optional[str] = None,
) -> None:
    """Restores pre-AFK nicknames across all shared guilds with pacing."""
    guilds = list(bot.guilds)
    for i, guild in enumerate(guilds):
        member = guild.get_member(user_id)
        if not member or not guild.me.guild_permissions.manage_nicknames:
            continue
        if member.top_role >= guild.me.top_role or member.id == guild.owner_id:
            continue

        if member.display_name.startswith(AFK_PREFIX):
            target_nick = (
                original_nick if original_nick else
                member.display_name.removeprefix(AFK_PREFIX).strip()
            )
            if target_nick == member.name:
                target_nick = None

            try:
                await member.edit(nick=target_nick)
            except (discord.Forbidden, discord.HTTPException) as exc:
                logger.debug(
                    "Failed to restore nick for %s in %s: %s",
                    member,
                    guild.name,
                    exc,
                )
            if i < len(guilds) - 1:
                await asyncio.sleep(0.5)


# --- MAIN PIPELINE INTERCEPTOR HANDLER ---
async def handle_afk(bot: discord.Client, message: discord.Message) -> None:
    """Interceptor for AFK logic:

    1. Removes AFK status via DB helper if the author sends a message.
    2. Sends DM notification to the AFK user when mentioned (with cooldown).
    3. Notifies the channel with a single consolidated embed (rate-limit protected).
    """
    if not message.guild or message.author.bot:
        return

    guild_id = message.guild.id
    author_id = message.author.id
    now_ts = int(time.time())
    now_float = time.time()
    _prune_caches(now_float)

    # --- PART 1: Remove AFK status for the author ---
    if is_user_afk_cached(author_id):
        afk_record = await get_afk(guild_id=guild_id, user_id=author_id)
        if afk_record:
            duration = max(0, now_ts - int(afk_record.since))
            minutes, seconds = divmod(duration, 60)
            hours, minutes = divmod(minutes, 60)

            time_str = f"{hours}h {minutes}m {seconds}s" if hours else f"{minutes}m {seconds}s"
            original_nick = afk_record.original_nickname

            await remove_afk(guild_id=guild_id, user_id=author_id)
            # Run nickname restoration in background to avoid blocking message pipeline
            asyncio.create_task(
                restore_afk_nicknames(bot, author_id, original_nick),
                name=f"restore_afk_nick_{author_id}",
            )

            welcome_embed = make_embed(
                title="AFK Removed",
                description=(
                    f"Welcome back {message.author.mention}! Your AFK status has been removed. "
                    f"(Duration: **{time_str}**)"
                ),
                level="SUCCESS",
                use_emoji=True,
            )
            try:
                await message.channel.send(embed=welcome_embed, delete_after=10)
            except discord.HTTPException:
                pass

    # --- PART 2: Handle Mentions of AFK Users ---
    if not message.mentions:
        return

    mentioned_ids = [
        m.id for m in message.mentions
        if m.id != author_id and not m.bot and is_user_afk_cached(m.id)
    ]
    if not mentioned_ids:
        return

    afk_records = await get_afk_records_for_users(
        guild_id=guild_id,
        user_ids=mentioned_ids,
    )
    if not afk_records:
        return

    channel_str = getattr(message.channel, "mention", f"#{message.channel}")

    # 1. Channel Notification (Consolidated & Cooldown-Checked)
    channel_lines = []
    for record in afk_records:
        member = message.guild.get_member(record.user_id)
        if not member:
            continue

        cache_key = (message.channel.id, record.user_id)
        last_channel_time = _CHANNEL_NOTICE_CACHE.get(cache_key, 0.0)
        if (now_float - last_channel_time) >= CHANNEL_NOTICE_COOLDOWN_SECONDS:
            channel_lines.append(
                f"• {member.mention} is AFK: **{record.afk_reason}** (<t:{record.since}:R>)"
            )
            _CHANNEL_NOTICE_CACHE[cache_key] = now_float

    if channel_lines:
        channel_embed = make_embed(
            title="User AFK Notice",
            description="\n".join(channel_lines),
            level="WARNING",
            use_emoji=True,
        )
        try:
            await message.channel.send(embed=channel_embed, delete_after=15)
        except discord.HTTPException:
            pass

    # 2. DM Notifications to AFK users with individual cooldown check
    for record in afk_records:
        member = message.guild.get_member(record.user_id)
        if not member:
            continue

        last_dm_time = _DM_COOLDOWN_CACHE.get(member.id, 0.0)
        if (now_float - last_dm_time) > DM_COOLDOWN_SECONDS:
            dm_embed = make_embed(
                title="You were mentioned while AFK",
                description=(
                    f"**{message.author.display_name}** mentioned you in **{message.guild.name}** "
                    f"({channel_str}).\n\n"
                    f"**Message:** {message.content[:500]}"
                ),
                level="INFO",
                use_emoji=True,
                url=message.jump_url,
            )
            try:
                await member.send(embed=dm_embed)
                _DM_COOLDOWN_CACHE[member.id] = now_float
            except discord.HTTPException:
                pass