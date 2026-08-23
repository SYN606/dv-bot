from __future__ import annotations

import time
from typing import Optional
from db.models import AFK, Guild, User


async def set_afk(guild_id: int,
                  user_id: int,
                  reason: str,
                  is_global: bool = False) -> AFK:
    """Sets or updates a user's AFK status for a given guild with local or global scope."""
    # Ensure foreign key records exist in 'guilds' and 'users' tables
    await Guild.get_or_create(guild_id=guild_id)
    await User.get_or_create(user_id=user_id)

    now = int(time.time())

    afk, _ = await AFK.update_or_create(
        guild_id=guild_id,
        user_id=user_id,
        defaults={
            "afk_reason": reason,
            "since": now,
            "is_global": is_global,
        },
    )
    return afk


async def make_afk_global(guild_id: int, user_id: int) -> Optional[AFK]:
    """Upgrades an existing local AFK status to global scope."""
    afk = await AFK.get_or_none(guild_id=guild_id, user_id=user_id)
    if afk:
        afk.is_global = True
        await afk.save()
        return afk
    return None


async def remove_afk(guild_id: int, user_id: int) -> Optional[AFK]:
    """Fetches and deletes a user's AFK record if it exists (checks both local and global).

    Returns the deleted AFK instance or None.
    """
    # Check for a local entry in this guild first, or a global entry anywhere for this user
    afk = await AFK.get_or_none(guild_id=guild_id, user_id=user_id)
    if not afk:
        afk = await AFK.get_or_none(user_id=user_id, is_global=True)

    if afk:
        await afk.delete()
        return afk
    return None


async def get_afk(guild_id: int, user_id: int) -> Optional[AFK]:
    """Retrieves a user's AFK record for a given guild, matching either local to the guild or global."""
    # Try finding an exact local match or a global match for the user
    return await AFK.get_or_none(guild_id=guild_id,
                                 user_id=user_id) or await AFK.get_or_none(
                                     user_id=user_id, is_global=True)
