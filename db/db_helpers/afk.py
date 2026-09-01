from __future__ import annotations

import time
from typing import Optional
from tortoise.expressions import Q
from db.models import AFK, Guild, User


async def set_afk(
    guild_id: int,
    user_id: int,
    reason: str,
    is_global: bool = False,
    original_nickname: Optional[str] = None,
) -> AFK:
    """Sets or updates a user's AFK status for a given guild with local or global scope."""
    # Fixed: Use primary key field names (guild_id / user_id) instead of 'id'
    await Guild.get_or_create(guild_id=guild_id)
    await User.get_or_create(user_id=user_id)

    now = int(time.time())

    defaults: dict[str, object] = {
        "afk_reason": reason,
        "since": now,
        "is_global": is_global,
    }
    if original_nickname is not None:
        defaults["original_nickname"] = original_nickname

    afk, _ = await AFK.update_or_create(
        guild_id=guild_id,
        user_id=user_id,
        defaults=defaults,
    )
    return afk


async def get_afk(guild_id: int, user_id: int) -> Optional[AFK]:
    """Retrieves an active AFK record for a user (checks global first, then guild-specific)."""
    global_afk = await AFK.filter(user_id=user_id, is_global=True).first()
    if global_afk:
        return global_afk

    return await AFK.filter(guild_id=guild_id, user_id=user_id).first()


async def get_afk_records_for_users(guild_id: int,
                                    user_ids: list[int]) -> list[AFK]:
    """Retrieves active AFK records for a list of target user IDs (global or server-specific)."""
    if not user_ids:
        return []

    return await AFK.filter(
        Q(user_id__in=user_ids) & (Q(is_global=True) | Q(guild_id=guild_id)))


async def remove_afk(guild_id: int, user_id: int) -> Optional[AFK]:
    """Checks and deletes any active AFK status (global or server-specific) for a user."""
    afk = await get_afk(guild_id=guild_id, user_id=user_id)
    if afk:
        await afk.delete()
        return afk

    return None
