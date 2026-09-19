from __future__ import annotations

from typing import Optional
from db.db_helpers.common import ensure_guild
from db.models import ModerationLogConfig

_MOD_LOG_CACHE: dict[int, Optional[int]] = {}


def clear_mod_log_cache(guild_id: Optional[int] = None) -> None:
    """Clears the active moderation log channel cache."""
    if guild_id is not None:
        _MOD_LOG_CACHE.pop(guild_id, None)
    else:
        _MOD_LOG_CACHE.clear()


# Set log channel
async def set_log_channel(guild_id: int, channel_id: int) -> None:
    """Sets or updates the log channel for a guild and enables logging."""
    await ensure_guild(guild_id)

    await ModerationLogConfig.update_or_create(
        guild_id=guild_id,
        defaults={
            "channel_id": channel_id,
            "enabled": True,
        },
    )
    _MOD_LOG_CACHE[guild_id] = channel_id


# Get log channel
async def get_log_channel(guild_id: int) -> int | None:
    """Fetches the active log channel ID for a guild if enabled with caching."""
    if guild_id in _MOD_LOG_CACHE:
        return _MOD_LOG_CACHE[guild_id]

    config = await ModerationLogConfig.get_or_none(
        guild_id=guild_id, enabled=True
    )
    channel_id = config.channel_id if config else None
    _MOD_LOG_CACHE[guild_id] = channel_id
    return channel_id


# Fetch the configured moderation log channel ID regardless of status
async def get_mod_log_channel_id(guild_id: int) -> int | None:
    """Fetch the configured moderation log channel ID for a guild."""
    config = await ModerationLogConfig.get_or_none(guild_id=guild_id)
    if not config or not config.channel_id:
        return None
    return config.channel_id


# Check enabled
async def is_modlog_enabled(guild_id: int) -> bool:
    """Checks whether moderation logging is enabled for a guild."""
    if guild_id in _MOD_LOG_CACHE and _MOD_LOG_CACHE[guild_id] is not None:
        return True
    return await ModerationLogConfig.filter(
        guild_id=guild_id, enabled=True
    ).exists()


# Enable modlogs
async def enable_modlogs(guild_id: int) -> bool:
    """Enables moderation logging for a guild."""
    updated_count = await ModerationLogConfig.filter(
        guild_id=guild_id
    ).update(enabled=True)
    _MOD_LOG_CACHE.pop(guild_id, None)
    return updated_count > 0


# Disable modlogs
async def disable_modlogs(guild_id: int) -> bool:
    """Disables moderation logging for a guild without deleting configuration."""
    updated_count = await ModerationLogConfig.filter(
        guild_id=guild_id
    ).update(enabled=False)
    _MOD_LOG_CACHE[guild_id] = None
    return updated_count > 0


# Remove modlog config
async def remove_log_channel(guild_id: int) -> bool:
    """Deletes the moderation log configuration record for a guild."""
    deleted_count = await ModerationLogConfig.filter(
        guild_id=guild_id
    ).delete()
    _MOD_LOG_CACHE[guild_id] = None
    return deleted_count > 0