import discord
from typing import Optional, Dict, Any

from sqlalchemy import select

from db.engine import AsyncSessionLocal
from db.models import ModerationLogConfig
from utils.embeds import make_embed

# Log Categories
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


# MAIN LOGGER
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

    Example:
        await send_mod_log(
            guild=guild,
            category="ROLE",
            title="Roles Updated",
            description="Added X, Removed Y",
            level="SUCCESS",
            actor=interaction.user,
            target=member,
        )
    """

    # Load log channel
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

    # Build embed
    category_name = LOG_CATEGORIES.get(category, "Moderation")

    fields = []

    if actor:
        fields.append(("Actor", actor.mention, True))

    if target:
        fields.append(("Target", target.mention, True))

    if extra_fields:
        for name, value in extra_fields.items():
            fields.append((name, str(value), False))

    embed = make_embed(
        title=f"[{category_name}] {title}",
        description=description,
        level=LOG_COLORS.get(level, "INFO"),
        fields=fields,
        footer=f"Guild ID: {guild.id}",
    )

    # Send safely
    try:
        await channel.send(embed=embed)
    except (discord.Forbidden, discord.NotFound):
        pass
