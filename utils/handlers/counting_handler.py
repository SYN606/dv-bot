import discord
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db.engine import AsyncSessionLocal
from db.models import CountingChannel
from utils.core.emojis import EMOJIS
from utils.core.embeds import make_embed


async def handle_counting(message: discord.Message) -> bool:
    """
    Production-safe counting handler.

    - Concurrency protected (row locking)
    - Prevents double-count race condition
    - Async safe
    """

    if message.guild is None or message.author.bot:
        return False

    content = message.content.strip()
    if not content.isdigit():
        return False

    number = int(content)

    async with AsyncSessionLocal() as session:

        # 🔐 LOCK ROW FOR UPDATE
        result = await session.execute(
            select(CountingChannel).where(
                CountingChannel.guild_id == message.guild.id,
                CountingChannel.channel_id == message.channel.id,
            ).with_for_update())

        row = result.scalar_one_or_none()

        if row is None:
            return False

        expected = row.current + 1

        # ─────────────────────────
        # SAME USER TWICE
        # ─────────────────────────
        if row.last_user_id == message.author.id:
            best = row.best
            row.current = 0
            row.last_user_id = None

            await session.commit()

            await _reset_message(message, "Same user counted twice", best)
            return True

        # ─────────────────────────
        # WRONG NUMBER
        # ─────────────────────────
        if number != expected:
            best = row.best
            row.current = 0
            row.last_user_id = None

            await session.commit()

            await _reset_message(
                message,
                f"Expected {expected}, got {number}",
                best,
            )
            return True

        # ─────────────────────────
        # CORRECT NUMBER
        # ─────────────────────────
        row.current = number
        row.last_user_id = message.author.id
        row.best = max(row.best, row.current)

        await session.commit()

    try:
        await message.add_reaction(EMOJIS["success"])
    except discord.HTTPException:
        pass

    return True


async def _reset_message(
    message: discord.Message,
    reason: str,
    best: int,
):
    try:
        await message.add_reaction(EMOJIS["fail"])
    except discord.HTTPException:
        pass

    try:
        await message.channel.send(embed=make_embed(
            title="Counting Reset",
            description=(
                f"{EMOJIS['fail']} The counting chain has been broken.\n\n"
                f"{EMOJIS['arrow_point']} Broken by: {message.author.mention}\n"
                f"{EMOJIS['red_dot']} Reason: {reason}\n"
                f"{EMOJIS['green_dot']} Best streak: {best}\n\n"
                f"{EMOJIS['ping']} Start again from 1"),
            level="SYSTEM",
            footer="Counting system • Digital Vigital",
        ))
    except discord.HTTPException:
        pass
