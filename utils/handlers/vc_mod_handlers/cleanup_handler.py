import discord

from db.db_helpers.vc_mod_helpers.vc_tracking import (
    get_guild_tracked_channels,
    remove_tracked_channel,
)

from utils.handlers.vc_mod_handlers.cache_handler import (
    remove_cache_mapping,
)

from utils.handlers.vc_mod_handlers.vc_helpers import (
    delete_vc_role,
)


# Cleanup stale VC mappings
async def cleanup_vc_tracking(
    guild: discord.Guild,
) -> int:

    cleaned = 0

    data = await get_guild_tracked_channels(
        guild.id,
    )

    for item in data:
        channel = guild.get_channel(
            item.channel_id,
        )

        role = guild.get_role(
            item.role_id,
        )

        # Valid mapping
        if channel and role:
            continue

        # Delete managed role
        if role and item.managed_role:
            await delete_vc_role(
                role,
            )

        # Remove DB entry
        await remove_tracked_channel(
            guild.id,
            item.channel_id,
        )

        # Remove cache
        remove_cache_mapping(
            guild.id,
            item.channel_id,
        )

        cleaned += 1

    return cleaned
