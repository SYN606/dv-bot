from __future__ import annotations

import inspect
from typing import cast
from db.db_helpers.common import ensure_guild
from db.models import AdminRole

_LOCAL_ADMIN_ROLE_CACHE: dict[int, set[int]] = {}


async def invalidate_admin_role_cache(guild_id: int) -> None:
    """Invalidates admin role caches locally and across permissions system."""
    _LOCAL_ADMIN_ROLE_CACHE.pop(guild_id, None)
    try:
        from utils.permissions.check_perms import clear_admin_role_cache
        res = clear_admin_role_cache(guild_id)
        if inspect.isawaitable(res):
            await res
    except Exception:
        pass


async def add_admin_role(guild_id: int, role_id: int) -> bool:
    """
    Adds an admin role to a guild.
    Returns True if created, False if it already existed.
    """
    await ensure_guild(guild_id)
    _, created = await AdminRole.get_or_create(
        guild_id=guild_id,
        role_id=role_id,
    )
    if created:
        await invalidate_admin_role_cache(guild_id)
    return created


async def remove_admin_role(guild_id: int, role_id: int) -> bool:
    """
    Removes an admin role from a guild.
    Returns True if a record was deleted, False otherwise.
    """
    deleted_count = await AdminRole.filter(
        guild_id=guild_id,
        role_id=role_id,
    ).delete()

    if deleted_count > 0:
        await invalidate_admin_role_cache(guild_id)
    return deleted_count > 0


async def get_admin_roles(guild_id: int) -> list[int]:
    """
    Retrieves all admin role IDs registered for a given guild with local caching.
    """
    cached = _LOCAL_ADMIN_ROLE_CACHE.get(guild_id)
    if cached is not None:
        return list(cached)

    roles = await AdminRole.filter(guild_id=guild_id).values_list("role_id",
                                                                  flat=True)
    role_list = cast(list[int], list(roles))
    _LOCAL_ADMIN_ROLE_CACHE[guild_id] = set(role_list)
    return role_list


async def is_admin_role(guild_id: int, role_id: int) -> bool:
    """
    Checks whether a specific role is an admin role in the given guild.
    """
    cached = _LOCAL_ADMIN_ROLE_CACHE.get(guild_id)
    if cached is not None:
        return role_id in cached

    return await AdminRole.filter(guild_id=guild_id, role_id=role_id).exists()

