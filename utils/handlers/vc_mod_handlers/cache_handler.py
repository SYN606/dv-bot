from db.db_helpers.vc_mod_helpers.vc_tracking import (
    get_guild_tracked_channels,
)

VC_ROLE_CACHE: dict[
    int,
    dict[int, int],
] = {}


# Build guild cache
async def build_guild_cache(
    guild_id: int,
) -> None:

    data = await get_guild_tracked_channels(guild_id)

    VC_ROLE_CACHE[guild_id] = {
        item.channel_id: item.role_id for item in data if item.enabled
    }


# Remove guild cache
def clear_guild_cache(
    guild_id: int,
) -> None:

    VC_ROLE_CACHE.pop(
        guild_id,
        None,
    )


# Set cache mapping
def set_cache_mapping(
    guild_id: int,
    channel_id: int,
    role_id: int,
) -> None:

    if guild_id not in VC_ROLE_CACHE:
        VC_ROLE_CACHE[guild_id] = {}

    VC_ROLE_CACHE[guild_id][channel_id] = role_id


# Remove cache mapping
def remove_cache_mapping(
    guild_id: int,
    channel_id: int,
) -> None:

    guild_cache = VC_ROLE_CACHE.get(guild_id)

    if not guild_cache:
        return

    guild_cache.pop(
        channel_id,
        None,
    )


# Get cached role
def get_cached_role(
    guild_id: int,
    channel_id: int,
) -> int | None:

    guild_cache = VC_ROLE_CACHE.get(guild_id)

    if not guild_cache:
        return None

    return guild_cache.get(channel_id)
