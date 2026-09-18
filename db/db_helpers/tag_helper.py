from __future__ import annotations

from typing import Dict, Optional
from db.models import Guild, TagConfig

_TAG_CONFIG_CACHE: Dict[int, Optional[TagConfig]] = {}


async def set_tag_config(guild_id: int, tag: str, role_id: int) -> TagConfig:
    """Creates or updates the tag auto-role configuration for a guild."""
    guild, _ = await Guild.get_or_create(guild_id=guild_id)
    config, _ = await TagConfig.update_or_create(
        guild=guild,
        defaults={
            "tag": tag,
            "role_id": role_id
        },
    )
    _TAG_CONFIG_CACHE[guild_id] = config
    return config


async def get_tag_config(guild_id: int) -> Optional[TagConfig]:
    """Fetches the tag auto-role configuration for a guild with caching."""
    if guild_id in _TAG_CONFIG_CACHE:
        return _TAG_CONFIG_CACHE[guild_id]

    config = await TagConfig.filter(guild_id=guild_id).first()
    _TAG_CONFIG_CACHE[guild_id] = config
    return config


async def delete_tag_config(guild_id: int) -> bool:
    """Deletes the tag auto-role configuration for a guild."""
    config = await get_tag_config(guild_id)
    if config:
        await config.delete()
        _TAG_CONFIG_CACHE[guild_id] = None
        return True
    _TAG_CONFIG_CACHE[guild_id] = None
    return False
