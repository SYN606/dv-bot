from __future__ import annotations

import discord

from db.db_helpers.analytics import (
    end_voice_session,
    log_member_join,
    log_member_remove,
    log_message_activity,
    start_voice_session,
)


async def handle_analytics_join(member: discord.Member) -> None:
    """Logs member join event to database."""
    await log_member_join(member.guild.id,
                          member.id,
                          joined_at=member.joined_at)


async def handle_analytics_leave(member: discord.Member) -> None:
    """Logs member leave event to database."""
    await log_member_remove(member.guild.id, member.id)


async def handle_analytics_message(message: discord.Message) -> None:
    """Logs message activity for user and guild analytics."""
    if message.author.bot or not message.guild:
        return

    await log_message_activity(
        guild_id=message.guild.id,
        user_id=message.author.id,
        channel_id=message.channel.id,
        created_at=message.created_at,
    )


async def handle_analytics_voice_state(
    member: discord.Member,
    before: discord.VoiceState,
    after: discord.VoiceState,
) -> None:
    """Tracks voice join, leave, and channel switch times for analytics."""
    if member.bot or not member.guild:
        return

    guild_id = member.guild.id
    user_id = member.id

    # User joined voice channel from disconnected state
    if before.channel is None and after.channel is not None:
        await start_voice_session(guild_id, user_id)

    # User disconnected from voice completely
    elif before.channel is not None and after.channel is None:
        await end_voice_session(guild_id,
                                user_id,
                                channel_id=before.channel.id)

    # Optional: User switched voice channels directly
    elif (before.channel is not None and after.channel is not None
          and before.channel.id != after.channel.id):
        await end_voice_session(guild_id,
                                user_id,
                                channel_id=before.channel.id)
        await start_voice_session(guild_id, user_id)
