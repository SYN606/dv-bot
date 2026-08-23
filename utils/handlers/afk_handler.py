import asyncio
import logging
import os
import time
from typing import Any, Dict, List, TYPE_CHECKING, cast

import discord
from discord import Message, MessageType
from discord.ext import commands

from db.db_helpers.afk import get_afk, remove_afk
from utils.core.embeds import make_embed
from utils.core.emojis import EMOJIS

if TYPE_CHECKING:
    from discord.ext.commands import Bot

logger = logging.getLogger("DigitalVigital")

AFK_IMAGE = os.getenv("AFK_IMAGE_URL")
AFK_PREFIX = "[AFK] "

_afk_notice_cooldown: dict[tuple[int, int], float] = {}
_channel_cooldown: dict[int, float] = {}
AFK_NOTICE_COOLDOWN = 10.0
CHANNEL_COOLDOWN = 5.0

# In-memory storage for missed mentions: (guild_id, user_id) -> list of mention dicts
_missed_mentions: Dict[tuple[int, int], List[Dict[str, Any]]] = {}


def format_duration(seconds: int) -> str:
    if seconds < 60:
        return f"{seconds}s"
    if seconds < 3600:
        return f"{seconds // 60}m {seconds % 60}s"
    if seconds < 86400:
        h = seconds // 3600
        m = (seconds % 3600) // 60
        return f"{h}h {m}s"
    d = seconds // 86400
    h = (seconds % 86400) // 3600
    return f"{d}d {h}h"


async def _restore_nickname(member: discord.Member) -> None:
    """Helper to safely restore user nickname in background without blocking response execution."""
    try:
        if member.guild.me.guild_permissions.manage_nicknames:
            if member.display_name.startswith(AFK_PREFIX):
                new_name = member.display_name.removeprefix(AFK_PREFIX)
                await member.edit(nick=new_name)
    except (discord.Forbidden, discord.HTTPException) as exc:
        logger.debug("Failed to restore nickname for %s: %s", member, exc)


async def _send_afk_dm(user: discord.User | discord.Member,
                       embed: discord.Embed) -> None:
    """Helper to dispatch DM alerts to AFK users asynchronously."""
    try:
        await user.send(embed=embed)
    except (discord.Forbidden, discord.HTTPException):
        pass


async def handle_afk(message: Message) -> bool:
    if message.guild is None or message.author.bot or message.webhook_id:
        return False

    if message.type != MessageType.default:
        return False

    guild_id = message.guild.id
    channel_id = message.channel.id
    now_ts = int(time.time())
    now_float = time.monotonic()

    # Cast client to commands.Bot safely to satisfy Pylance
    bot = cast(commands.Bot, message._state._get_client())

    # Check if message is a command using bot process check
    ctx = await bot.get_context(message)
    if ctx.valid:
        return False

    # 1. PROCESS MENTIONS (IF MESSAGE MENTIONS AFK USERS)
    handled = False
    afk_sections = []
    unique_mentions = {m.id: m for m in message.mentions if not m.bot}.values()

    # Safe channel attributes extraction avoiding DMChannel/PartialMessageable errors
    channel_name = getattr(message.channel, "name", "channel")
    channel_mention = getattr(message.channel, "mention", f"#{channel_name}")

    for user in unique_mentions:
        if user.id == message.author.id:
            continue

        try:
            afk = await get_afk(guild_id, user.id)
        except Exception:
            continue

        if not afk:
            continue

        handled = True

        # Store mention details for welcome-back summary
        mention_info = {
            "author":
            str(message.author),
            "content":
            message.content[:100] +
            ("..." if len(message.content) > 100 else ""),
            "jump_url":
            message.jump_url,
            "timestamp":
            now_ts,
        }
        _missed_mentions.setdefault((guild_id, user.id),
                                    []).append(mention_info)

        # Dispatch DM task in background
        dm_embed = make_embed(
            title=
            f"{EMOJIS.get('announcement', '📢')} You were mentioned while AFK!",
            description=
            (f"**Server:** {message.guild.name}\n"
             f"**Channel:** {channel_mention}\n"
             f"**Mentioned by:** {message.author.mention} (`{message.author}`)\n"
             f"**Message:** {message.content}\n\n"
             f"[➡️ Jump to Message]({message.jump_url})"),
            level="INFO",
        )
        asyncio.create_task(_send_afk_dm(user, dm_embed))

        # Check channel and user cooldown before appending public AFK notice
        key = (guild_id, user.id)
        last_notice = _afk_notice_cooldown.get(key, 0.0)

        if now_float - last_notice >= AFK_NOTICE_COOLDOWN:
            _afk_notice_cooldown[key] = now_float
            since_ts = int(afk.since)
            arrow = EMOJIS.get("arrow_point", "➡️")

            afk_sections.append(f"**{user.display_name}**\n"
                                f"{arrow} **Reason:** {afk.afk_reason}\n"
                                f"{arrow} **Away Since:** <t:{since_ts}:R>")

    # Send public AFK notice in the channel if cooldown permits
    last_channel = _channel_cooldown.get(channel_id, 0.0)
    if afk_sections and (now_float - last_channel >= CHANNEL_COOLDOWN):
        _channel_cooldown[channel_id] = now_float
        embed = make_embed(
            title=f"{EMOJIS.get('announcement', '📢')} AFK Notice",
            description="\n\n".join(afk_sections),
            level="INFO",
        )
        embed.set_footer(text="They have been notified via DM.")
        if AFK_IMAGE:
            embed.set_image(url=AFK_IMAGE)

        try:
            await message.reply(
                embed=embed,
                mention_author=False,
                allowed_mentions=discord.AllowedMentions.none(),
            )
        except Exception:
            pass

    # 2. PROCESS AFK REMOVAL (IF THE AFK AUTHOR SPEAKS)
    removed = await remove_afk(guild_id, message.author.id)

    if removed:
        handled = True
        since_ts = int(removed.since)
        duration = max(0, now_ts - since_ts)

        # Restore Nickname in non-blocking background task
        if isinstance(message.author, discord.Member):
            asyncio.create_task(_restore_nickname(message.author))

        # Retrieve stored missed mentions for this user
        missed = _missed_mentions.pop((guild_id, message.author.id), [])

        description_lines = [
            f"{EMOJIS.get('okay', '👌')} Your AFK status has been removed.\n",
            f"{EMOJIS.get('arrow_point', '➡️')} **AFK Duration:** {format_duration(duration)}",
            f"{EMOJIS.get('arrow_point', '➡️')} **Away Since:** <t:{since_ts}:R>\n",
        ]

        if missed:
            description_lines.append(f"**Missed Mentions ({len(missed)}):**")
            for idx, m in enumerate(missed[:5], 1):
                description_lines.append(
                    f"`{idx}.` **{m['author']}**: {m['content']} — [Jump to Message]({m['jump_url']})"
                )
            if len(missed) > 5:
                description_lines.append(
                    f"*...and {len(missed) - 5} more mentions.*")

        embed = make_embed(
            title=f"{EMOJIS.get('success', '✅')} Welcome Back!",
            description="\n".join(description_lines),
            level="SUCCESS",
        )
        embed.set_footer(
            text=f"Action by: {message.author}",
            icon_url=message.author.display_avatar.url,
        )

        try:
            await message.reply(
                embed=embed,
                mention_author=False,
                allowed_mentions=discord.AllowedMentions.none(),
            )
        except Exception:
            pass

    return handled
