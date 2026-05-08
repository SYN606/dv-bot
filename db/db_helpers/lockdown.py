from datetime import datetime
from typing import List

from sqlalchemy import delete, distinct, select

from sqlalchemy.dialects.sqlite import (
    insert as sqlite_insert, )

from sqlalchemy.dialects.postgresql import (
    insert as postgres_insert, )

from db.engine import (
    AsyncSessionLocal,
    DB_DIALECT,
)

from db.models import (
    ChannelPermissionSnapshot,
    VerificationConfig,
)


# Internal insert builder
def build_insert_stmt(
    model,
    values: dict,
):

    if DB_DIALECT == "postgresql":
        return postgres_insert(model).values(**values)

    return sqlite_insert(model).values(**values)


# Security role detection
async def get_security_roles(guild, ) -> list[int]:

    roles = {guild.default_role.id}

    async with AsyncSessionLocal() as session:

        config = await session.scalar(
            select(VerificationConfig).where(
                VerificationConfig.guild_id == guild.id))

        if config:

            if config.verified_role_id:
                roles.add(config.verified_role_id)

            if config.unverified_role_id:
                roles.add(config.unverified_role_id)

    return list(roles)


# Single snapshot
async def set_permission_snapshot(
    guild_id: int,
    channel_id: int,
    target_id: int,
    send_messages: bool | None,
    actor_id: int,
    connect: bool | None = None,
    speak: bool | None = None,
    expires_at: datetime | None = None,
) -> None:

    async with AsyncSessionLocal() as session:

        stmt = build_insert_stmt(
            ChannelPermissionSnapshot,
            {
                "guild_id": guild_id,
                "channel_id": channel_id,
                "target_id": target_id,
                "send_messages": send_messages,
                "connect": connect,
                "speak": speak,
                "locked_by": actor_id,
                "expires_at": expires_at,
            },
        )

        stmt = stmt.on_conflict_do_update(
            index_elements=[
                ChannelPermissionSnapshot.guild_id,
                ChannelPermissionSnapshot.channel_id,
                ChannelPermissionSnapshot.target_id,
            ],
            set_={
                "send_messages": send_messages,
                "connect": connect,
                "speak": speak,
                "locked_by": actor_id,
                "expires_at": expires_at,
            },
        )

        await session.execute(stmt)
        await session.commit()


# Bulk snapshots
async def set_permission_snapshots(
    guild_id: int,
    channel_id: int,
    snapshots: list[tuple[
        int,
        bool | None,
        bool | None,
        bool | None,
    ]],
    actor_id: int,
    expires_at: datetime | None = None,
) -> None:

    async with AsyncSessionLocal() as session:

        for (
                target_id,
                send_messages,
                connect,
                speak,
        ) in snapshots:

            stmt = build_insert_stmt(
                ChannelPermissionSnapshot,
                {
                    "guild_id": guild_id,
                    "channel_id": channel_id,
                    "target_id": target_id,
                    "send_messages": send_messages,
                    "connect": connect,
                    "speak": speak,
                    "locked_by": actor_id,
                    "expires_at": expires_at,
                },
            )

            stmt = stmt.on_conflict_do_update(
                index_elements=[
                    ChannelPermissionSnapshot.guild_id,
                    ChannelPermissionSnapshot.channel_id,
                    ChannelPermissionSnapshot.target_id,
                ],
                set_={
                    "send_messages": send_messages,
                    "connect": connect,
                    "speak": speak,
                    "locked_by": actor_id,
                    "expires_at": expires_at,
                },
            )

            await session.execute(stmt)

        await session.commit()


# Fetch snapshots
async def get_permission_snapshots(
    guild_id: int,
    channel_id: int,
) -> List[ChannelPermissionSnapshot]:

    async with AsyncSessionLocal() as session:

        result = await session.scalars(
            select(ChannelPermissionSnapshot).where(
                ChannelPermissionSnapshot.guild_id == guild_id,
                ChannelPermissionSnapshot.channel_id == channel_id,
            ))

        return list(result)


# Delete snapshots
async def remove_permission_snapshots(
    guild_id: int,
    channel_id: int,
) -> bool:

    async with AsyncSessionLocal() as session:

        result = await session.execute(
            delete(ChannelPermissionSnapshot).where(
                ChannelPermissionSnapshot.guild_id == guild_id,
                ChannelPermissionSnapshot.channel_id == channel_id,
            ))

        await session.commit()

        return (getattr(result, "rowcount", 0) or 0) > 0


# Check lock state
async def is_channel_locked(
    guild_id: int,
    channel_id: int,
) -> bool:

    async with AsyncSessionLocal() as session:

        result = await session.scalar(
            select(ChannelPermissionSnapshot.channel_id).where(
                ChannelPermissionSnapshot.guild_id == guild_id,
                ChannelPermissionSnapshot.channel_id == channel_id,
            ).limit(1))

        return result is not None


# Fetch locked channels
async def get_locked_channels(guild_id: int, ) -> list[int]:

    async with AsyncSessionLocal() as session:

        result = await session.scalars(
            select(distinct(ChannelPermissionSnapshot.channel_id)).where(
                ChannelPermissionSnapshot.guild_id == guild_id))

        return list(result)


# Fetch expired snapshots
async def get_expired_snapshots(
    now: datetime, ) -> List[ChannelPermissionSnapshot]:

    async with AsyncSessionLocal() as session:

        result = await session.scalars(
            select(ChannelPermissionSnapshot).where(
                ChannelPermissionSnapshot.expires_at.is_not(None),
                ChannelPermissionSnapshot.expires_at <= now,
            ))

        return list(result)
