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

    db = SessionLocal()
    try:
        cfg = db.query(VerificationConfig).filter_by(guild_id=guild.id).first()
    finally:
        db.close()

    if not cfg or not cfg.log_channel_id:
        return  # logging not configured

    channel = guild.get_channel(cfg.log_channel_id)
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
