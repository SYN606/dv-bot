from __future__ import annotations

import time
from typing import Optional, Set
from tortoise.expressions import Q
from db.models import AFK, Guild, User

_ACTIVE_AFK_USERS: Optional[Set[int]] = None


async def _ensure_afk_cache() -> Set[int]:
    """Ensures the in-memory cache of AFK user IDs is populated."""
    global _ACTIVE_AFK_USERS
    if _ACTIVE_AFK_USERS is None:
        try:
            ids = await AFK.all().values_list("user_id", flat=True)
            _ACTIVE_AFK_USERS = set(ids)
        except Exception:
            _ACTIVE_AFK_USERS = set()
    return _ACTIVE_AFK_USERS


async def init_afk_cache() -> Set[int]:
    """Explicitly initializes or refreshes the in-memory active AFK users cache."""
    return await _ensure_afk_cache()


def is_user_afk_cached(user_id: int) -> bool:
    """Synchronous fast-path check: returns False if user is definitely not AFK."""
    if _ACTIVE_AFK_USERS is not None:
        return user_id in _ACTIVE_AFK_USERS
    return True


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

    cache = await _ensure_afk_cache()
    cache.add(user_id)
    return afk


async def get_afk(guild_id: int, user_id: int) -> Optional[AFK]:
    """Retrieves an active AFK record for a user (checks global first, then guild-specific)."""
    cache = await _ensure_afk_cache()
    if user_id not in cache:
        return None

    global_afk = await AFK.filter(user_id=user_id, is_global=True).first()
    if global_afk:
        return global_afk

    record = await AFK.filter(guild_id=guild_id, user_id=user_id).first()
    if not record:
        has_any = await AFK.filter(user_id=user_id).exists()
        if not has_any:
            cache.discard(user_id)
    return record


async def get_afk_records_for_users(guild_id: int,
                                    user_ids: list[int]) -> list[AFK]:
    """Retrieves active AFK records for a list of target user IDs (global or server-specific)."""
    if not user_ids:
        return []

    cache = await _ensure_afk_cache()
    candidate_ids = [uid for uid in user_ids if uid in cache]
    if not candidate_ids:
        return []

    return await AFK.filter(
        Q(user_id__in=candidate_ids) & (Q(is_global=True) | Q(guild_id=guild_id)))


async def remove_afk(guild_id: int, user_id: int) -> Optional[AFK]:
    """Checks and deletes any active AFK status (global or server-specific) for a user."""
    cache = await _ensure_afk_cache()
    if user_id not in cache:
        return None

    afk = await get_afk(guild_id=guild_id, user_id=user_id)
    if afk:
        await afk.delete()
        has_other = await AFK.filter(user_id=user_id).exists()
        if not has_other:
            cache.discard(user_id)
        return afk

    return None
