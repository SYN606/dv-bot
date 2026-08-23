from db.models import Guild, StickyMessage

THRESHOLD = 1


# Set sticky
async def set_sticky(guild_id: int, channel_id: int, content: str) -> None:
    """Sets or updates a sticky message for a specific channel."""
    # Ensure foreign key record exists in the 'guilds' table
    await Guild.get_or_create(guild_id=guild_id)

    await StickyMessage.update_or_create(
        guild_id=guild_id,
        channel_id=channel_id,
        defaults={
            "sticky_content": content,
            "counter": 0,
            "last_message_id": None,
        },
    )


# Remove sticky
async def remove_sticky(guild_id: int, channel_id: int) -> bool:
    """Deletes a sticky message configuration for a channel."""
    deleted_count = await StickyMessage.filter(guild_id=guild_id,
                                               channel_id=channel_id).delete()
    return deleted_count > 0


# Get sticky
async def get_sticky(guild_id: int, channel_id: int) -> str | None:
    """Fetches the sticky content for a channel if it exists."""
    sticky = await StickyMessage.get_or_none(guild_id=guild_id,
                                             channel_id=channel_id)
    return sticky.sticky_content if sticky else None


# Sticky repost step
async def sticky_step(guild_id: int,
                      channel_id: int) -> tuple[str, int | None] | None:
    """Increments the message counter and returns the sticky payload if the threshold is met."""
    sticky = await StickyMessage.get_or_none(guild_id=guild_id,
                                             channel_id=channel_id)
    if not sticky:
        return None

    sticky.counter += 1

    if sticky.counter < THRESHOLD:
        await sticky.save(update_fields=["counter"])
        return None

    # Repost threshold met: extract values and reset tracking state
    content = sticky.sticky_content
    last_message_id = sticky.last_message_id

    sticky.counter = 0
    sticky.last_message_id = None
    await sticky.save(update_fields=["counter", "last_message_id"])

    return content, last_message_id


# Update last sticky message
async def update_last_message(guild_id: int, channel_id: int,
                              message_id: int) -> None:
    """Updates the tracking ID of the last sent sticky message."""
    await StickyMessage.filter(
        guild_id=guild_id,
        channel_id=channel_id).update(last_message_id=message_id)
