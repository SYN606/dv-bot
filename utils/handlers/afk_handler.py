from discord import Message
import time

from utils.embeds import make_embed
from db.db_helpers.afk import get_afk, remove_afk

AFK_IMAGE = ("https://cdn.discordapp.com/attachments/1476443404207652916/"
             "1476448367835086868/e30e439f4537f017.jpg")


async def handle_afk(message: Message) -> bool:
    """
    Fully async AFK handler.

    - Notifies when mentioned users are AFK
    - Removes AFK when author speaks
    - Proper timestamp handling
    - Clean styled response
    """

    if message.guild is None or message.author.bot:
        return False

    handled = False
    guild_id = message.guild.id
    now = int(time.time())

    # Check mentioned users
    for user in message.mentions:

        afk = await get_afk(guild_id, user.id)

        if not afk:
            continue

        handled = True

        # Convert stored time safely
        since_ts = int(afk.since)

        embed = make_embed(
            title="User is AFK",
            description=(f"{user.mention} is currently away.\n\n"
                         f"**Reason:** {afk.reason}\n"
                         f"**Since:** <t:{since_ts}:R>"),
            level="INFO",
        )

        embed.set_image(url=AFK_IMAGE)

        await message.channel.send(embed=embed)

    # Remove author AFK
    removed = await remove_afk(guild_id, message.author.id)

    if removed:
        handled = True

        since_ts = int(removed.since)
        duration = now - since_ts

        embed = make_embed(
            title="Welcome Back",
            description=(f"You are no longer marked as AFK.\n\n"
                         f"**AFK Duration:** <t:{since_ts}:R>\n"
                         f"({duration} seconds total)"),
            level="SUCCESS",
        )

        embed.set_image(url=AFK_IMAGE)

        await message.channel.send(embed=embed)

    return handled
