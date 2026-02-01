import discord
from sqlalchemy.orm import Session

from db.engine import SessionLocal
from db.models import CountingChannel
from utils.emojis import EMOJIS
from utils.embeds import make_embed


async def handle_counting(message: discord.Message) -> bool:
    """
    Handles counting gameplay logic.
    Returns True if the message was handled and should not be processed further.
    """

    if message.guild is None:
        return False

    if message.author.bot:
        return False

    content = message.content.strip()
    if not content.isdigit():
        return False

    db: Session = SessionLocal()
    try:
        row = (db.query(CountingChannel).filter_by(
            guild_id=message.guild.id,
            channel_id=message.channel.id,
        ).first())

        if row is None:
            return False

        number = int(content)
        expected = row.current + 1

        # ❌ Same user counted twice
        if row.last_user_id == message.author.id:
            await _reset(
                message,
                row,
                db,
                "Same user counted twice",
            )
            return True

        # ❌ Wrong number
        if number != expected:
            await _reset(
                message,
                row,
                db,
                f"Expected {expected}, got {number}",
            )
            return True

        # ✅ Correct count
        row.current = number
        row.last_user_id = message.author.id
        row.best = max(row.best, row.current)
        db.commit()

        await message.add_reaction(EMOJIS["success"])
        return True

    finally:
        db.close()


async def _reset(
    message: discord.Message,
    row: CountingChannel,
    db: Session,
    reason: str,
) -> None:
    """
    Resets the counting state and announces the reset.
    """

    breaker = message.author
    best = row.best

    # Reset DB state
    row.current = 0
    row.last_user_id = None
    db.commit()

    # React on the breaking message
    await message.add_reaction(EMOJIS["fail"])

    # Announce reset in channel
    await message.channel.send(embed=make_embed(
        title="Counting Reset",
        description=(
            f"{EMOJIS['fail']} The counting chain has been **broken**.\n\n"
            f"{EMOJIS['arrow_point']} **Broken by:** {breaker.mention}\n"
            f"{EMOJIS['red_dot']} **Reason:** {reason}\n"
            f"{EMOJIS['green_dot']} **Best streak:** {best}\n\n"
            f"{EMOJIS['ping']} Start again from **1**"),
        level="SYSTEM",
        footer="Counting system • Digital Vigital",
    ))
