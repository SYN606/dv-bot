import discord
from typing import Optional, Dict, Any

from sqlalchemy import select

from db.engine import AsyncSessionLocal
from db.models import ModerationLogConfig
from utils.embeds import make_embed

# Log Configuration

LOG_COLORS = {
    "INFO": "INFO",
    "SUCCESS": "SUCCESS",
    "WARNING": "WARNING",
    "ERROR": "ERROR",
    "SYSTEM": "SYSTEM",
}

LOG_CATEGORIES = {
    "ROLE": "Role Management",
    "BAN": "Moderation",
    "PURGE": "Message Cleanup",
    "VERIFY": "Verification",
    "CONFIG": "Configuration",
}


# Main Logger
async def send_mod_log(
    *,
    guild: discord.Guild,
    category: str,
    title: str,
    description: str,
    level: str = "INFO",
    actor: Optional[discord.abc.User] = None,
    target: Optional[discord.abc.User] = None,
    extra_fields: Optional[Dict[str, Any]] = None,
) -> None:
    """
    Structured moderation logger.
    Sends a formatted embed to the configured moderation log channel.
    """

    # Load Log Channel From Database
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(ModerationLogConfig).where(
                ModerationLogConfig.guild_id == guild.id))
        row = result.scalar_one_or_none()

    if not row:
        return

    channel = guild.get_channel(row.channel_id)

    if not isinstance(channel, discord.TextChannel):
        return

    # Prepare Data

    category = category.upper()
    level = level.upper()

    category_name = LOG_CATEGORIES.get(category, "Moderation")
    level_name = LOG_COLORS.get(level, "INFO")

    fields = []

    if actor:
        fields.append(("Actor", actor.mention, True))

    if target:
        fields.append(("Target", target.mention, True))

    if extra_fields:
        for name, value in extra_fields.items():
            if value is None:
                continue
            fields.append((str(name), str(value), False))

    # Build Embed

    embed = make_embed(
        title=f"[{category_name}] {title}",
        description=description,
        level=level_name,
        fields=fields if fields else None,
        footer=f"Guild ID: {guild.id}",
    )

    # Send Safely

    try:
        await channel.send(embed=embed)
    except (discord.Forbidden, discord.NotFound):
        return
    except Exception:
        # Prevent logger from ever crashing the bot
        return
