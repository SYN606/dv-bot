from discord import Message

from utils.embeds import make_embed
from db.db_helpers.afk import get_afk, remove_afk


async def handle_afk(message: Message) -> bool:
    """
    Fully async AFK handler.

    - Notifies when mentioned users are AFK
    - Removes AFK when author speaks
    - Zero thread wrappers
    - Non-blocking
    """

    if message.guild is None or message.author.bot:
        return False

    handled = False
    guild_id = message.guild.id

    # ─────────────────────────────
    # Check mentioned users
    # ─────────────────────────────
    for user in message.mentions:

        afk = await get_afk(guild_id, user.id)

        if not afk:
            continue

        handled = True

        await message.channel.send(embed=make_embed(
            title="User is AFK",
            description=(f"{user.mention} is currently AFK.\n"
                         f"**Reason:** {afk.reason}\n"
                         f"**Since:** <t:{afk.since}:R>"),
            level="INFO",
        ))

    # ─────────────────────────────
    # Remove author AFK
    # ─────────────────────────────
    removed = await remove_afk(guild_id, message.author.id)

    if removed:
        handled = True

        await message.channel.send(embed=make_embed(
            title="AFK Removed",
            description=("Welcome back. You are no longer marked as AFK.\n"
                         f"AFK duration: <t:{removed.since}:R>"),
            level="INFO",
        ))

    return handled
