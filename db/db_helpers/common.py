from __future__ import annotations

from typing import Dict, Set
from tortoise import Tortoise
from db.models import Guild, User

_KNOWN_GUILDS_PER_CONN: Dict[int, Set[int]] = {}
_KNOWN_USERS_PER_CONN: Dict[int, Set[int]] = {}


def _get_active_cache(per_conn_cache: Dict[int, Set[int]]) -> Set[int]:
    try:
        conn = Tortoise.get_connection("default")
        conn_id = id(conn)
        # Keep map size small if connections cycle
        if len(per_conn_cache) > 8:
            per_conn_cache.clear()
        return per_conn_cache.setdefault(conn_id, set())
    except Exception:
        return set()


async def ensure_guild(guild_id: int) -> Guild:
    """Ensures a Guild record exists with zero DB roundtrips after initial discovery."""
    known_guilds = _get_active_cache(_KNOWN_GUILDS_PER_CONN)
    if guild_id in known_guilds:
        return Guild(guild_id=guild_id)

    guild, _ = await Guild.get_or_create(guild_id=guild_id)
    known_guilds.add(guild_id)
    return guild


async def ensure_user(user_id: int) -> User:
    """Ensures a User record exists with zero DB roundtrips after initial discovery."""
    known_users = _get_active_cache(_KNOWN_USERS_PER_CONN)
    if user_id in known_users:
        return User(user_id=user_id)

    user, _ = await User.get_or_create(user_id=user_id)
    known_users.add(user_id)
    return user


async def ensure_guild_and_user(guild_id: int, user_id: int) -> tuple[Guild, User]:
    """Ensures relational Guild and User foreign key records exist."""
    guild = await ensure_guild(guild_id)
    user = await ensure_user(user_id)
    return guild, user


async def ensure_guild_and_users(guild_id: int, *user_ids: int) -> None:
    """Ensures a Guild and multiple User foreign key records exist."""
    await ensure_guild(guild_id)
    for uid in user_ids:
        await ensure_user(uid)


def clear_entity_cache() -> None:
    """Clears the in-memory cache of discovered guilds and users."""
    _KNOWN_GUILDS_PER_CONN.clear()
    _KNOWN_USERS_PER_CONN.clear()



__all__ = [
    "ensure_guild",
    "ensure_user",
    "ensure_guild_and_user",
    "ensure_guild_and_users",
    "clear_entity_cache",
]
