from typing import Any, Dict, Optional, Set, Tuple, cast
from db.models import Guild, MediaOnlyChannel

_MEDIA_CHANNELS_CACHE: Optional[Set[int]] = None
_MEDIA_CONFIG_CACHE: Dict[Tuple[int, int], Optional[MediaOnlyChannel]] = {}


async def _ensure_media_cache() -> Set[int]:
    """Ensures the in-memory cache of media-only channel IDs is loaded."""
    global _MEDIA_CHANNELS_CACHE
    if _MEDIA_CHANNELS_CACHE is None:
        try:
            channels = await MediaOnlyChannel.all().values_list("channel_id", flat=True)
            _MEDIA_CHANNELS_CACHE = set(channels)
        except Exception:
            _MEDIA_CHANNELS_CACHE = set()
    return _MEDIA_CHANNELS_CACHE


async def init_media_cache() -> Set[int]:
    """Explicitly initializes or refreshes the in-memory media channels cache."""
    return await _ensure_media_cache()


def is_media_channel_cached(channel_id: int) -> bool:
    """Fast check: returns False if channel is definitely not a media-only channel."""
    if _MEDIA_CHANNELS_CACHE is not None:
        return channel_id in _MEDIA_CHANNELS_CACHE
    return True


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
    cache = await _ensure_media_cache()
    cache.add(channel_id)
    _MEDIA_CONFIG_CACHE.pop((guild_id, channel_id), None)
    return created


# Disable media only
async def disable_media_only(guild_id: int, channel_id: int) -> bool:
    """Deletes a MediaOnlyChannel record for a given channel."""
    deleted_count = await MediaOnlyChannel.filter(
        guild_id=guild_id, channel_id=channel_id).delete()
    cache = await _ensure_media_cache()
    cache.discard(channel_id)
    _MEDIA_CONFIG_CACHE.pop((guild_id, channel_id), None)
    return deleted_count > 0


# Fetch full config
async def get_media_only_config(guild_id: int,
                                channel_id: int) -> MediaOnlyChannel | None:
    """Fetches full media-only configuration model for a channel."""
    cache = await _ensure_media_cache()
    if channel_id not in cache:
        return None

    key = (guild_id, channel_id)
    if key in _MEDIA_CONFIG_CACHE:
        return _MEDIA_CONFIG_CACHE[key]

    config = await MediaOnlyChannel.get_or_none(guild_id=guild_id,
                                              channel_id=channel_id)
    if not config:
        cache.discard(channel_id)
    _MEDIA_CONFIG_CACHE[key] = config
    return config


# Simple check
async def is_media_only(guild_id: int, channel_id: int) -> bool:
    """Checks if a channel is configured as media-only."""
    cache = await _ensure_media_cache()
    if channel_id not in cache:
        return False
    return await MediaOnlyChannel.filter(guild_id=guild_id,
                                         channel_id=channel_id).exists()


# Update sticky message id
async def update_sticky_message_id(guild_id: int, channel_id: int,
                                   message_id: int | None) -> None:
    """Updates the sticky message ID for the media channel."""
    await MediaOnlyChannel.filter(
        guild_id=guild_id,
        channel_id=channel_id).update(sticky_message_id=message_id)
    cached = _MEDIA_CONFIG_CACHE.get((guild_id, channel_id))
    if cached:
        cached.sticky_message_id = message_id


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
    _MEDIA_CONFIG_CACHE.pop((guild_id, channel_id), None)

    return updated_count > 0


# Fetch all media channels
async def get_media_only_channels(guild_id: int) -> list[int]:
    """Retrieves all channel IDs configured as media-only within a guild."""
    channels = await MediaOnlyChannel.filter(guild_id=guild_id
                                             ).values_list("channel_id",
                                                           flat=True)

    return cast(list[int], channels)
