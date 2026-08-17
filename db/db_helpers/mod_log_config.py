from typing import Optional
from db.models import ModerationLogConfig


async def get_mod_log_channel_id(guild_id: int) -> Optional[int]:
    """Fetch the configured moderation log channel ID for a guild using Tortoise ORM."""
    config = await ModerationLogConfig.get_or_none(guild_id=guild_id)
    if not config or not config.channel_id:
        return None
    return config.channel_id
