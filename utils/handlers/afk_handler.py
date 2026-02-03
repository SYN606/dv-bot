import asyncio
from discord import Message

from utils.embeds import make_embed
from db.db_helpers.afk import get_afk, remove_afk


async def handle_afk(message: Message) -> None:
    # Safety checks
    if message.guild is None or message.author.bot:
        return

    # ─────────────────────────
    # AFK CHECK FOR MENTIONS
    # ─────────────────────────
    for user in message.mentions:
        afk = await asyncio.to_thread(
            get_afk,
            message.guild.id,
            user.id,
        )

        if not afk:
            continue

        embed = make_embed(
            title="User is AFK",
            description=(f"{user.mention} is currently AFK.\n"
                         f"Reason: {afk.reason}\n"
                         f"Since: <t:{afk.since}:R>"),
            level="INFO",
        )
        await message.channel.send(embed=embed)

    # ─────────────────────────
    # REMOVE AUTHOR AFK STATUS
    # ─────────────────────────
    removed = await asyncio.to_thread(
        remove_afk,
        guild_id=message.guild.id,
        user_id=message.author.id,
    )

    if not removed:
        return

    embed = make_embed(
        title="AFK Removed",
        description=("Welcome back. You are no longer marked as AFK.\n"
                     f"AFK duration: <t:{removed.since}:R>"),
        level="INFO",
    )
    await message.channel.send(embed=embed)
