import os
import time
from discord import Message

from utils.embeds import make_embed
from db.db_helpers.afk import get_afk, remove_afk

AFK_IMAGE = os.getenv("AFK_IMAGE_URL")

# cooldown per mentioned user
_afk_notice_cooldown: dict[int, float] = {}


def format_duration(seconds: int) -> str:

    if seconds < 60:
        return f"{seconds}s"

    if seconds < 3600:
        return f"{seconds // 60}m {seconds % 60}s"

    if seconds < 86400:
        hours = seconds // 3600
        minutes = (seconds % 3600) // 60
        return f"{hours}h {minutes}m"

    days = seconds // 86400
    hours = (seconds % 86400) // 3600
    return f"{days}d {hours}h"


async def handle_afk(message: Message) -> bool:

    if message.guild is None or message.author.bot:
        return False

    handled = False
    guild_id = message.guild.id
    now = int(time.time())

    afk_lines = []

    # deduplicate mentions
    unique_mentions = {u.id: u for u in message.mentions}.values()

    for user in unique_mentions:

        last = _afk_notice_cooldown.get(user.id, 0)

        if now - last < 10:
            continue

        afk = await get_afk(guild_id, user.id)

        if not afk:
            continue

        _afk_notice_cooldown[user.id] = now

        handled = True
        since_ts = int(afk.since)

        afk_lines.append(f"{user.mention}\n"
                         f"**Reason:** {afk.reason}\n"
                         f"**Since:** <t:{since_ts}:R>\n")

    if afk_lines:

        embed = make_embed(
            title="AFK Notice",
            description="\n".join(afk_lines),
            level="INFO",
        )

        if AFK_IMAGE:
            embed.set_image(url=AFK_IMAGE)

        await message.reply(embed=embed, mention_author=False)

    removed = await remove_afk(guild_id, message.author.id)

    if removed:

        handled = True

        since_ts = int(removed.since)
        duration = now - since_ts

        embed = make_embed(
            title="Welcome Back",
            description=("You are no longer marked as AFK.\n\n"
                         f"**AFK Duration:** {format_duration(duration)} "
                         f"(<t:{since_ts}:R>)"),
            level="SUCCESS",
        )

        if AFK_IMAGE:
            embed.set_image(url=AFK_IMAGE)

        await message.reply(embed=embed, mention_author=False)

    return handled
