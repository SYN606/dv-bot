from db.models import Guild, ModerationLogConfig


# Set log channel
async def set_log_channel(guild_id: int, channel_id: int) -> None:
    """Sets or updates the log channel for a guild and enables logging."""
    # Ensure foreign key record exists in the 'guilds' table
    await Guild.get_or_create(guild_id=guild_id)

    await ModerationLogConfig.update_or_create(
        guild_id=guild_id,
        defaults={
            "channel_id": channel_id,
            "enabled": True,
        },
    )


# Get log channel
async def get_log_channel(guild_id: int) -> int | None:
    """Fetches the active log channel ID for a guild if enabled."""
    config = await ModerationLogConfig.get_or_none(
        guild_id=guild_id, enabled=True
    )
    return config.channel_id if config else None


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
    return await ModerationLogConfig.filter(
        guild_id=guild_id, enabled=True
    ).exists()


# Enable modlogs
async def enable_modlogs(guild_id: int) -> bool:
    """Enables moderation logging for a guild."""
    updated_count = await ModerationLogConfig.filter(
        guild_id=guild_id
    ).update(enabled=True)
    return updated_count > 0


# Disable modlogs
async def disable_modlogs(guild_id: int) -> bool:
    """Disables moderation logging for a guild without deleting configuration."""
    updated_count = await ModerationLogConfig.filter(
        guild_id=guild_id
    ).update(enabled=False)
    return updated_count > 0


# Remove modlog config
async def remove_log_channel(guild_id: int) -> bool:
    """Deletes the moderation log configuration record for a guild."""
    deleted_count = await ModerationLogConfig.filter(
        guild_id=guild_id
    ).delete()
    return deleted_count > 0