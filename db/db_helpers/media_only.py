from typing import Any, cast
from db.models import Guild, MediaOnlyChannel


# Enable media only
async def enable_media_only(
    guild_id: int,
    channel_id: int,
    *,
    whitelist_role_id: int | None = None,
    image_only: bool = False,
    auto_mute: bool = False,
    nsfw_bypass: bool = True,
) -> bool:
    """Creates a MediaOnlyChannel record if it doesn't already exist."""
    # Ensure foreign key record exists in the 'guilds' table
    await Guild.get_or_create(guild_id=guild_id)

    _, created = await MediaOnlyChannel.get_or_create(
        guild_id=guild_id,
        channel_id=channel_id,
        defaults={
            "whitelist_role_id": whitelist_role_id,
            "image_only": image_only,
            "auto_mute": auto_mute,
            "nsfw_bypass": nsfw_bypass,
        },
    )
    return created


# Disable media only
async def disable_media_only(guild_id: int, channel_id: int) -> bool:
    """Deletes a MediaOnlyChannel record for a given channel."""
    deleted_count = await MediaOnlyChannel.filter(
        guild_id=guild_id, channel_id=channel_id).delete()
    return deleted_count > 0


# Fetch full config
async def get_media_only_config(guild_id: int,
                                channel_id: int) -> MediaOnlyChannel | None:
    """Fetches full media-only configuration model for a channel."""
    return await MediaOnlyChannel.get_or_none(guild_id=guild_id,
                                              channel_id=channel_id)


# Simple check
async def is_media_only(guild_id: int, channel_id: int) -> bool:
    """Checks if a channel is configured as media-only."""
    return await MediaOnlyChannel.filter(guild_id=guild_id,
                                         channel_id=channel_id).exists()


# Update sticky message id
async def update_sticky_message_id(guild_id: int, channel_id: int,
                                   message_id: int | None) -> None:
    """Updates the sticky message ID for the media channel."""
    await MediaOnlyChannel.filter(
        guild_id=guild_id,
        channel_id=channel_id).update(sticky_message_id=message_id)


# Update settings
async def update_media_only_settings(
    guild_id: int,
    channel_id: int,
    *,
    whitelist_role_id: int | None = None,
    image_only: bool | None = None,
    auto_mute: bool | None = None,
    nsfw_bypass: bool | None = None,
) -> bool:
    """Updates specific configuration parameters for a media-only channel."""
    fields: dict[str, Any] = {
        "whitelist_role_id": whitelist_role_id,
        "image_only": image_only,
        "auto_mute": auto_mute,
        "nsfw_bypass": nsfw_bypass,
    }

    # Unpack non-None keyword arguments cleanly
    update_data = {k: v for k, v in fields.items() if v is not None}
    if not update_data:
        return False

    updated_count = await MediaOnlyChannel.filter(
        guild_id=guild_id, channel_id=channel_id).update(**update_data)

    return updated_count > 0


# Fetch all media channels
async def get_media_only_channels(guild_id: int) -> list[int]:
    """Retrieves all channel IDs configured as media-only within a guild."""
    channels = await MediaOnlyChannel.filter(guild_id=guild_id
                                             ).values_list("channel_id",
                                                           flat=True)

    return cast(list[int], channels)
