import asyncio
import discord
from typing import Optional

from db.engine import SessionLocal
from db.models import VerificationConfig
from utils.embeds import make_embed


async def send_mod_log(
    *,
    guild: discord.Guild,
    title: str,
    description: str,
    level: str = "INFO",
    actor: Optional[discord.abc.User] = None,
) -> None:
    """
    Send a moderation log embed to the configured log channel.
    """

    # ── Load log channel ID from DB (off event loop)
    log_channel_id = await asyncio.to_thread(
        _get_log_channel_id,
        guild.id,
    )

    if not log_channel_id:
        return

    channel = guild.get_channel(log_channel_id)
    if not isinstance(channel, discord.TextChannel):
        return

    embed = make_embed(
        title=title,
        description=description,
        level=level,
        footer=f"Action by {actor}" if actor else None,
    )

    try:
        await channel.send(embed=embed)
    except discord.Forbidden:
        pass
    except discord.NotFound:
        pass


# ─────────────────────────
# DB LOGIC (SYNC, THREAD)
# ─────────────────────────
def _get_log_channel_id(guild_id: int) -> Optional[int]:
    db = SessionLocal()
    try:
        cfg = (db.query(VerificationConfig).filter_by(
            guild_id=guild_id).first())
        return cfg.log_channel_id if cfg else None
    finally:
        db.close()
