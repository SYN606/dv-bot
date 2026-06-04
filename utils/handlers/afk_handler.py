import os
import time
import discord
from discord import Message, MessageType
from utils.core.embeds import make_embed
from utils.core.emojis import EMOJIS
from db.db_helpers.afk import get_afk, remove_afk

AFK_IMAGE = os.getenv("AFK_IMAGE_URL")

_afk_notice_cooldown: dict[tuple[int, int], int] = {}
_channel_cooldown: dict[int, float] = {}
AFK_NOTICE_COOLDOWN = 10
CHANNEL_COOLDOWN = 5.0


def format_duration(seconds: int) -> str:
    if seconds < 60:
        return f"{seconds}s"
    if seconds < 3600:
        return f"{seconds // 60}m {seconds % 60}s"
    if seconds < 86400:
        h = seconds // 3600
        m = (seconds % 3600) // 60
        return f"{h}h {m}m"
    d = seconds // 86400
    h = (seconds % 86400) // 3600
    return f"{d}d {h}h"


async def handle_afk(message: Message) -> bool:

    if message.guild is None:
        return False

    if message.author.bot or message.webhook_id:
        return False

    if message.type != MessageType.default:
        return False

    bot = message.guild._state._get_client()
    prefix = await bot.get_prefix(message)  # type: ignore

    # ignore commands (safe check)
    if isinstance(prefix, (list, tuple)):
        if any(message.content.startswith(p) for p in prefix):
            return False
    else:
        if message.content.startswith(prefix):
            return False

    handled = False
    guild_id = message.guild.id
    channel_id = message.channel.id
    now = int(time.time())

    afk_sections = []

    unique_mentions = {m.id: m for m in message.mentions}.values()

    # AFK CHECK
    for user in unique_mentions:

        key = (guild_id, user.id)
        last = _afk_notice_cooldown.get(key, 0)

        if now - last < AFK_NOTICE_COOLDOWN:
            continue

        try:
            afk = await get_afk(guild_id, user.id)
        except Exception:
            continue

        if not afk:
            continue

        _afk_notice_cooldown[key] = now
        handled = True

        since_ts = int(afk.since)

        afk_sections.append(
            f"**{user.display_name}**\n"
            f"{EMOJIS['arrow_point']} **Reason:** {afk.afk_reason}\n"
            f"{EMOJIS['arrow_point']} **Away Since:** <t:{since_ts}:R>")

    # CHANNEL THROTTLE
    last_channel = _channel_cooldown.get(channel_id, 0)
    now_float = time.monotonic()
    can_send = now_float - last_channel >= CHANNEL_COOLDOWN

    # SEND AFK NOTICE
    if afk_sections and can_send:
        _channel_cooldown[channel_id] = now_float
        embed = make_embed(title=f"{EMOJIS['announcement']} AFK Notice",
                           description="\n\n".join(afk_sections),
                           level="INFO")

        embed.set_footer(text="They will be notified when they return.")

        if AFK_IMAGE:
            embed.set_image(url=AFK_IMAGE)

        try:
            await message.reply(
                embed=embed,
                mention_author=False,
                allowed_mentions=discord.AllowedMentions.none())
        except Exception:
            pass

    # REMOVE AFK
    removed = await remove_afk(guild_id, message.author.id)

    if removed:
        handled = True

        since_ts = int(removed.since)
        duration = now - since_ts

        # Restore nickname
        if isinstance(message.author, discord.Member):
            try:
                if message.guild.me.guild_permissions.manage_nicknames:
                    nick = message.author.nick
                    if nick and nick.startswith("[AFK] "):
                        new_name = nick.replace("[AFK] ", "", 1)
                        await message.author.edit(nick=new_name)
            except Exception:
                pass

        embed = make_embed(
            title=f"{EMOJIS['success']} Welcome Back!",
            description=
            (f"{EMOJIS['okay']} Your AFK status has been removed.\n\n"
             f"{EMOJIS['arrow_point']} **AFK Duration:** {format_duration(duration)}\n"
             f"{EMOJIS['arrow_point']} **Away Since:** <t:{since_ts}:R>"),
            level="SUCCESS")

        try:
            await message.reply(
                embed=embed,
                mention_author=False,
                allowed_mentions=discord.AllowedMentions.none())
        except Exception:
            pass
    return handled
