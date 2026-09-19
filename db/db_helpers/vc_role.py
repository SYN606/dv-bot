from __future__ import annotations

import logging
from typing import Optional
from db.db_helpers.common import ensure_guild
from db.models import VCRoleConfig

logger = logging.getLogger("Digital Vigital")

_VC_ROLE_CACHE: dict[int, Optional[int]] = {}


def clear_vc_role_cache(guild_id: Optional[int] = None) -> None:
    """Clears the in-memory VC role configuration cache."""
    if guild_id is not None:
        _VC_ROLE_CACHE.pop(guild_id, None)
    else:
        _VC_ROLE_CACHE.clear()


async def get_vc_role_id(guild_id: int) -> Optional[int]:
    """
    Retrieve the configured VC role ID for a given guild with memory caching.

    :param guild_id: The Discord guild ID.
    :return: Role ID if configured, otherwise None.
    """
    if guild_id in _VC_ROLE_CACHE:
        return _VC_ROLE_CACHE[guild_id]

    try:
        config = await VCRoleConfig.get_or_none(guild_id=guild_id)
        role_id = config.role_id if config else None
        _VC_ROLE_CACHE[guild_id] = role_id
        return role_id
    except Exception as exc:
        logger.error("Failed to fetch VC role ID for guild %s: %s", guild_id,
                     exc)
        return None


async def set_vc_role_id(guild_id: int, role_id: int) -> bool:
    """
    Set or update the VC role ID for a guild.

    :param guild_id: The Discord guild ID.
    :param role_id: The Discord role ID to assign to users in VC.
    :return: True if successful, False otherwise.
    """
    try:
        await ensure_guild(guild_id)

        await VCRoleConfig.update_or_create(
            guild_id=guild_id,
            defaults={"role_id": role_id},
        )
        _VC_ROLE_CACHE[guild_id] = role_id
        return True
    except Exception as exc:
        logger.error("Failed to set VC role ID for guild %s: %s", guild_id,
                     exc)
        return False


async def remove_vc_role_id(guild_id: int) -> bool:
    """
    Remove the VC role configuration for a guild.

    :param guild_id: The Discord guild ID.
    :return: True if deleted or wasn't set, False if deletion failed.
    """
    try:
        deleted_count = await VCRoleConfig.filter(guild_id=guild_id).delete()
        _VC_ROLE_CACHE[guild_id] = None
        return deleted_count > 0
    except Exception as exc:
        logger.error("Failed to remove VC role config for guild %s: %s",
                     guild_id, exc)
        return False

