from __future__ import annotations

import logging
from typing import Optional
from db.models import VCRoleConfig  # Adjust import path based on your models location
logger = logging.getLogger("Digital Vigital")


async def get_vc_role_id(guild_id: int) -> Optional[int]:
    """
    Retrieve the configured VC role ID for a given guild.

    :param guild_id: The Discord guild ID.
    :return: Role ID if configured, otherwise None.
    """
    try:
        config = await VCRoleConfig.get_or_none(guild_id=guild_id)
        return config.role_id if config else None
    except Exception as exc:
        logger.error("Failed to fetch VC role ID for guild %s: %s", guild_id, exc)
        return None


async def set_vc_role_id(guild_id: int, role_id: int) -> bool:
    """
    Set or update the VC role ID for a guild.

    :param guild_id: The Discord guild ID.
    :param role_id: The Discord role ID to assign to users in VC.
    :return: True if successful, False otherwise.
    """
    try:
        await VCRoleConfig.update_or_create(
            guild_id=guild_id,
            defaults={"role_id": role_id},
        )
        return True
    except Exception as exc:
        logger.error("Failed to set VC role ID for guild %s: %s", guild_id, exc)
        return False


async def remove_vc_role_id(guild_id: int) -> bool:
    """
    Remove the VC role configuration for a guild.

    :param guild_id: The Discord guild ID.
    :return: True if deleted or wasn't set, False if deletion failed.
    """
    try:
        deleted_count = await VCRoleConfig.filter(guild_id=guild_id).delete()
        return deleted_count > 0
    except Exception as exc:
        logger.error("Failed to remove VC role config for guild %s: %s", guild_id, exc)
        return False