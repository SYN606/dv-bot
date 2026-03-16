import os
import time
from discord import Message, MessageType

from utils.embeds import make_embed
from utils.emojis import EMOJIS
from db.db_helpers.afk import get_afk, remove_afk

AFK_IMAGE = os.getenv("AFK_IMAGE_URL")

# cooldown per (guild_id, user_id)
_afk_notice_cooldown: dict[tuple[int, int], int] = {}

# cooldown duration in seconds
AFK_NOTICE_COOLDOWN = 10


def format_duration(seconds: int) -> str:

    if seconds < 60:
        return f"{seconds}s"

    if seconds < 3600:
        minutes = seconds // 60
        sec = seconds % 60
        return f"{minutes}m {sec}s"

    if seconds < 86400:
        hours = seconds // 3600
        minutes = (seconds % 3600) // 60
        return f"{hours}h {minutes}m"

    days = seconds // 86400
    hours = (seconds % 86400) // 3600
    return f"{days}d {hours}h"


async def handle_afk(message: Message) -> bool:
    """
    Handles AFK logic for:
    - Mentioning AFK users
    - Removing AFK when user sends message
    """

    # ─────────────────────────
    # BASIC SAFETY FILTERS
    # ─────────────────────────
    if message.guild is None or message.author.bot:
        return False

    if message.type != MessageType.default:
        return False

    if message.webhook_id:
        return False

    # ignore bot commands
    bot = message.guild._state._get_client()  # type: ignore
    ctx = await bot.get_context(message) # type: ignore

    if ctx.valid:
        return False

    handled = False
    guild_id = message.guild.id
    now = int(time.time())

    afk_sections = []

    # ─────────────────────────
    # CHECK MENTIONED USERS
    # ─────────────────────────
    unique_mentions = {u.id: u for u in message.mentions}.values()

    for user in unique_mentions:
        last = _afk_notice_cooldown.get(user.id, 0) # type: ignore

        if now - last < AFK_NOTICE_COOLDOWN:
            continue

        try:
            afk = await get_afk(guild_id, user.id)
        except Exception:
            continue

        if not afk:
            continue

        _afk_notice_cooldown[key] = now # type: ignore

        handled = True

        since_ts = int(afk.since)

        afk_sections.append(
            f"**{user.display_name}** ({user.mention})\n"
            f"{EMOJIS['arrow_point']} **Reason:** {afk.reason}\n"
            f"{EMOJIS['arrow_point']} **Away Since:** <t:{since_ts}:R>"
        )

    # ─────────────────────────
    # SEND AFK NOTICE
    # ─────────────────────────
    if afk_sections:
        embed = make_embed(
            title=f"{EMOJIS['announcement']} AFK Notice",
            description="\n\n".join(afk_sections),
            level="INFO",
        )

        embed.set_footer(text="They will be notified when they return.")

        if AFK_IMAGE:
            embed.set_image(url=AFK_IMAGE)

        try:
            await message.reply(embed=embed, mention_author=False)
        except Exception:
            pass

    # ─────────────────────────
    # REMOVE AFK IF AUTHOR RETURNS
    # ─────────────────────────
    removed = await remove_afk(guild_id, message.author.id)

    if removed:
        handled = True

        since_ts = int(removed.since)
        duration = now - since_ts

        embed = make_embed(
            title=f"{EMOJIS['success']} Welcome Back!",
            description=(
                f"{EMOJIS['okay']} Your AFK status has been removed.\n\n"
                f"{EMOJIS['arrow_point']} **AFK Duration:** {format_duration(duration)}\n"
                f"{EMOJIS['arrow_point']} **Away Since:** <t:{since_ts}:R>"
            ),
            level="SUCCESS",
        )

        embed.set_footer(text="Welcome back! Hope you're doing well.")

        # No image here intentionally

        try:
            await message.reply(embed=embed, mention_author=False)
        except Exception:
            pass

    return handled
