import asyncio
import discord
from sqlalchemy.orm import Session

from db.engine import SessionLocal
from db.models import CountingChannel
from utils.emojis import EMOJIS
from utils.embeds import make_embed


async def handle_counting(message: discord.Message) -> bool:
    if message.guild is None or message.author.bot:
        return False

    content = message.content.strip()
    if not content.isdigit():
        return False

    # Run DB logic off the event loop
    result = await asyncio.to_thread(
        _process_counting_db,
        guild_id=message.guild.id,
        channel_id=message.channel.id,
        user_id=message.author.id,
        number=int(content),
    )

    if result is None:
        return False

    action = result["action"]

    if action == "ok":
        await message.add_reaction(EMOJIS["success"])
        return True

    if action == "reset":
        await message.add_reaction(EMOJIS["fail"])
        await message.channel.send(embed=make_embed(
            title="Counting Reset",
            description=
            (f"{EMOJIS['fail']} The counting chain has been **broken**.\n\n"
             f"{EMOJIS['arrow_point']} **Broken by:** {message.author.mention}\n"
             f"{EMOJIS['red_dot']} **Reason:** {result['reason']}\n"
             f"{EMOJIS['green_dot']} **Best streak:** {result['best']}\n\n"
             f"{EMOJIS['ping']} Start again from **1**"),
            level="SYSTEM",
            footer="Counting system • Digital Vigital",
        ))
        return True

    return False


# ─────────────────────────
# DB LOGIC (SYNC, THREAD)
# ─────────────────────────
def _process_counting_db(
    *,
    guild_id: int,
    channel_id: int,
    user_id: int,
    number: int,
) -> dict | None:
    db: Session = SessionLocal()
    try:
        row = (db.query(CountingChannel).filter_by(
            guild_id=guild_id, channel_id=channel_id).first())

        if row is None:
            return None

        expected = row.current + 1

        # Same user twice
        if row.last_user_id == user_id:
            best = row.best
            row.current = 0
            row.last_user_id = None
            db.commit()
            return {
                "action": "reset",
                "reason": "Same user counted twice",
                "best": best,
            }

        # Wrong number
        if number != expected:
            best = row.best
            row.current = 0
            row.last_user_id = None
            db.commit()
            return {
                "action": "reset",
                "reason": f"Expected {expected}, got {number}",
                "best": best,
            }

        # Correct count
        row.current = number
        row.last_user_id = user_id
        row.best = max(row.best, row.current)
        db.commit()

        return {"action": "ok"}

    finally:
        db.close()
