from __future__ import annotations

from typing import Optional
from db.models import Guild, TagConfig


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
    return config


async def get_tag_config(guild_id: int) -> Optional[TagConfig]:
    """Fetches the tag auto-role configuration for a guild."""
    return await TagConfig.filter(guild_id=guild_id).first()


async def delete_tag_config(guild_id: int) -> bool:
    """Deletes the tag auto-role configuration for a guild."""
    config = await get_tag_config(guild_id)
    if config:
        await config.delete()
        return True
    return False
