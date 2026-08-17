import time
from typing import Optional
from db.models import AFK


async def set_afk(guild_id: int, user_id: int, reason: str) -> AFK:
    """
    Sets or updates a user's AFK status for a given guild.
    """
    now = int(time.time())

    afk, _ = await AFK.update_or_create(
        guild_id=guild_id,
        user_id=user_id,
        defaults={
            "afk_reason": reason,
            "since": now,
        },
    )
    return afk


async def remove_afk(guild_id: int, user_id: int) -> Optional[AFK]:
    """
    Fetches and deletes a user's AFK record if it exists.
    Returns the deleted AFK instance or None.
    """
    afk = await AFK.get_or_none(guild_id=guild_id, user_id=user_id)
    if afk:
        await afk.delete()
        return afk
    return None


async def get_afk(guild_id: int, user_id: int) -> Optional[AFK]:
    """
    Retrieves a user's AFK record for a given guild.
    """
    return await AFK.get_or_none(guild_id=guild_id, user_id=user_id)
