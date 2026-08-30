from __future__ import annotations

from datetime import datetime, timezone
from typing import Sequence, cast

import discord

from db.models import (AutoRoleRewardConfig, ChannelActivity,
                       ChannelRestriction, DailyActivitySnapshot,
                       FeatureModule, Guild, HourlyActivity, MemberAnalytics,
                       RestrictionScope, RoleRestriction, User)


# Foreign Key Helpers
async def ensure_guild_and_user(guild_id: int,
                                user_id: int) -> tuple[Guild, User]:
    """Ensures primary Guild and User relational records exist."""
    guild, _ = await Guild.get_or_create(guild_id=guild_id)
    user, _ = await User.get_or_create(user_id=user_id)
    return guild, user


# Event & Metric Logging Helpers
async def log_member_join(
    guild_id: int,
    user_id: int,
    joined_at: datetime | None = None,
) -> None:
    """Logs a new member join and updates the daily snapshot."""
    await ensure_guild_and_user(guild_id, user_id)
    now = joined_at or datetime.now(timezone.utc)

    record, created = await MemberAnalytics.get_or_create(
        guild_id=guild_id,
        user_id=user_id,
        defaults={"joined_at": now},
    )
    if not created:
        record.is_active = True
        record.joined_at = now
        record.left_at = None
        await record.save()

    snapshot, _ = await DailyActivitySnapshot.get_or_create(
        guild_id=guild_id,
        date=now.date(),
    )
    snapshot.joins_count += 1
    await snapshot.save()


async def log_member_remove(
    guild_id: int,
    user_id: int,
    left_at: datetime | None = None,
) -> None:
    """Logs a member leaving and increments leave counts."""
    now = left_at or datetime.now(timezone.utc)
    record = await MemberAnalytics.get_or_none(guild_id=guild_id,
                                               user_id=user_id)
    if record:
        record.is_active = False
        record.left_at = now
        await record.save()

    snapshot, _ = await DailyActivitySnapshot.get_or_create(
        guild_id=guild_id,
        date=now.date(),
    )
    snapshot.leaves_count += 1
    await snapshot.save()


async def log_message_activity(
    guild_id: int,
    user_id: int,
    channel_id: int,
    created_at: datetime | None = None,
) -> None:
    """Increments text activity across user metrics, daily snapshots, channel analytics, and peak hours."""
    now = created_at or datetime.now(timezone.utc)
    today = now.date()

    await ensure_guild_and_user(guild_id, user_id)

    # 1. Update Member Profile
    user_analytics, _ = await MemberAnalytics.get_or_create(
        guild_id=guild_id,
        user_id=user_id,
        defaults={"joined_at": now},
    )
    user_analytics.total_messages += 1
    user_analytics.weekly_messages += 1
    user_analytics.last_active_at = now
    await user_analytics.save()

    # 2. Daily Server Snapshot
    snapshot, _ = await DailyActivitySnapshot.get_or_create(
        guild_id=guild_id,
        date=today,
    )
    snapshot.total_messages += 1
    await snapshot.save()

    # 3. Channel Activity
    ch_activity, _ = await ChannelActivity.get_or_create(
        guild_id=guild_id,
        channel_id=channel_id,
        date=today,
    )
    ch_activity.message_count += 1
    await ch_activity.save()

    # 4. Hourly Peak Metrics
    hourly, _ = await HourlyActivity.get_or_create(
        guild_id=guild_id,
        day_of_week=now.weekday(),
        hour_of_day=now.hour,
    )
    hourly.message_count += 1
    await hourly.save()


async def start_voice_session(
    guild_id: int,
    user_id: int,
    joined_at: datetime | None = None,
) -> None:
    """Records the timestamp when a member enters a VC."""
    now = joined_at or datetime.now(timezone.utc)
    await ensure_guild_and_user(guild_id, user_id)
    record, _ = await MemberAnalytics.get_or_create(
        guild_id=guild_id,
        user_id=user_id,
        defaults={"joined_at": now},
    )
    record.active_vc_start = now
    await record.save()


async def end_voice_session(
    guild_id: int,
    user_id: int,
    channel_id: int,
    left_at: datetime | None = None,
) -> int:
    """Calculates active VC duration and commits time spent to member and channel records."""
    now = left_at or datetime.now(timezone.utc)
    record = await MemberAnalytics.get_or_none(guild_id=guild_id,
                                               user_id=user_id)
    if not record or not record.active_vc_start:
        return 0

    duration = int((now - record.active_vc_start).total_seconds())
    record.total_vc_seconds += duration
    record.weekly_vc_seconds += duration
    record.active_vc_start = None
    record.last_active_at = now
    await record.save()

    ch_activity, _ = await ChannelActivity.get_or_create(
        guild_id=guild_id,
        channel_id=channel_id,
        date=now.date(),
    )
    ch_activity.vc_seconds_spent += duration
    await ch_activity.save()

    return duration


# Fetching / Query Helpers
async def get_user_stats(guild_id: int,
                         user_id: int) -> MemberAnalytics | None:
    """Retrieves single-member analytics profile."""
    return await MemberAnalytics.get_or_none(guild_id=guild_id,
                                             user_id=user_id)


async def get_top_chatters(
    guild_id: int,
    limit: int = 10,
) -> Sequence[MemberAnalytics]:
    """Fetches top text chatters in a guild by weekly messages."""
    return (await MemberAnalytics.filter(
        guild_id=guild_id,
        is_active=True).order_by("-weekly_messages").limit(limit))


async def get_top_vc_members(
    guild_id: int,
    limit: int = 10,
) -> Sequence[MemberAnalytics]:
    """Fetches top VC active members in a guild by weekly VC seconds."""
    return (await MemberAnalytics.filter(
        guild_id=guild_id,
        is_active=True).order_by("-weekly_vc_seconds").limit(limit))


async def get_eligible_top_members(
    guild: discord.Guild,
    metric: str,
    limit: int = 3,
) -> list[tuple[discord.Member, int]]:
    """Fetches top active members for a weekly metric, skipping blacklisted role holders or bots."""
    blacklisted_ids = set(await get_role_restrictions(
        guild.id,
        feature=FeatureModule.AUTO_ROLE,
        restriction_type=RestrictionScope.DENY,
    ))
    order_field = "-weekly_messages" if metric == "chat" else "-weekly_vc_seconds"

    candidates = (await MemberAnalytics.filter(
        guild_id=guild.id,
        is_active=True).order_by(order_field).limit(limit * 5))

    eligible: list[tuple[discord.Member, int]] = []
    for candidate in candidates:
        member = guild.get_member(candidate.user_id)
        if not member or member.bot:
            continue

        member_role_ids = {role.id for role in member.roles}
        if member_role_ids.intersection(blacklisted_ids):
            continue

        score = (candidate.weekly_messages
                 if metric == "chat" else candidate.weekly_vc_seconds)
        if score <= 0:
            continue

        eligible.append((member, score))
        if len(eligible) == limit:
            break

    return eligible


async def get_server_retention_stats(
    guild_id: int,
    since_date: datetime,
) -> dict[str, float | int]:
    """Calculates member growth, join counts, leave counts, and retention rate over a given period."""
    total_active = await MemberAnalytics.filter(
        guild_id=guild_id,
        is_active=True,
    ).count()
    snapshots = await DailyActivitySnapshot.filter(
        guild_id=guild_id,
        date__gte=since_date.date(),
    )

    total_joins = sum(s.joins_count for s in snapshots)
    total_leaves = sum(s.leaves_count for s in snapshots)

    recently_joined = await MemberAnalytics.filter(
        guild_id=guild_id,
        joined_at__gte=since_date,
    ).count()
    retained = await MemberAnalytics.filter(
        guild_id=guild_id,
        joined_at__gte=since_date,
        is_active=True,
    ).count()

    retention_rate = ((retained / recently_joined *
                       100) if recently_joined > 0 else 100.0)

    return {
        "total_active": total_active,
        "total_joins": total_joins,
        "total_leaves": total_leaves,
        "net_growth": total_joins - total_leaves,
        "retention_rate": retention_rate,
    }


async def get_peak_hours(
    guild_id: int,
    limit: int = 3,
) -> Sequence[HourlyActivity]:
    """Retrieves top peak hours for message activity."""
    return (await
            HourlyActivity.filter(guild_id=guild_id
                                  ).order_by("-message_count").limit(limit))


# Auto-Role Configuration Helpers
async def get_autorole_config(guild_id: int) -> AutoRoleRewardConfig | None:
    """Fetches configured top-member auto-roles for a guild."""
    return await AutoRoleRewardConfig.get_or_none(guild_id=guild_id)


async def update_auto_role_config(
    guild_id: int,
    **kwargs,
) -> AutoRoleRewardConfig:
    """Updates auto-role configuration settings for a guild."""
    await Guild.get_or_create(guild_id=guild_id)
    config, _ = await AutoRoleRewardConfig.get_or_create(guild_id=guild_id)

    for key, value in kwargs.items():
        if value is not None and hasattr(config, key):
            setattr(config, key, value)

    await config.save()
    return config


# --- Universal Restriction System Helpers (Roles & Channels) ---


async def add_role_restriction(
    guild_id: int,
    role_id: int,
    feature: FeatureModule,
    restriction_type: RestrictionScope,
) -> bool:
    """Adds a role allowlist or deny list rule for a feature. Returns True if created."""
    await Guild.get_or_create(guild_id=guild_id)
    _, created = await RoleRestriction.get_or_create(
        guild_id=guild_id,
        role_id=role_id,
        feature=feature,
        restriction_type=restriction_type,
    )
    return created


async def remove_role_restriction(
    guild_id: int,
    role_id: int,
    feature: FeatureModule,
    restriction_type: RestrictionScope,
) -> bool:
    """Removes a role restriction rule for a feature. Returns True if deleted."""
    deleted = await RoleRestriction.filter(
        guild_id=guild_id,
        role_id=role_id,
        feature=feature,
        restriction_type=restriction_type,
    ).delete()
    return deleted > 0


async def get_role_restrictions(
    guild_id: int,
    feature: FeatureModule,
    restriction_type: RestrictionScope,
) -> list[int]:
    """Fetches role IDs for a specific feature and restriction scope."""
    results = await RoleRestriction.filter(
        guild_id=guild_id,
        feature=feature,
        restriction_type=restriction_type,
    ).values_list("role_id", flat=True)
    return cast(list[int], list(results))


async def add_channel_restriction(
    guild_id: int,
    channel_id: int,
    feature: FeatureModule,
    restriction_type: RestrictionScope,
) -> bool:
    """Adds a channel allowlist or deny list rule for a feature. Returns True if created."""
    await Guild.get_or_create(guild_id=guild_id)
    _, created = await ChannelRestriction.get_or_create(
        guild_id=guild_id,
        channel_id=channel_id,
        feature=feature,
        restriction_type=restriction_type,
    )
    return created


async def remove_channel_restriction(
    guild_id: int,
    channel_id: int,
    feature: FeatureModule,
    restriction_type: RestrictionScope,
) -> bool:
    """Removes a channel restriction rule for a feature. Returns True if deleted."""
    deleted = await ChannelRestriction.filter(
        guild_id=guild_id,
        channel_id=channel_id,
        feature=feature,
        restriction_type=restriction_type,
    ).delete()
    return deleted > 0


async def get_channel_restrictions(
    guild_id: int,
    feature: FeatureModule,
    restriction_type: RestrictionScope,
) -> list[int]:
    """Fetches channel IDs for a specific feature and restriction scope."""
    results = await ChannelRestriction.filter(
        guild_id=guild_id,
        feature=feature,
        restriction_type=restriction_type,
    ).values_list("channel_id", flat=True)
    return cast(list[int], list(results))


# Leaderboard Reset Helpers
async def reset_weekly_activity(guild_id: int) -> None:
    """Resets weekly message and VC counters for a guild."""
    await MemberAnalytics.filter(guild_id=guild_id).update(
        weekly_messages=0,
        weekly_vc_seconds=0,
    )
