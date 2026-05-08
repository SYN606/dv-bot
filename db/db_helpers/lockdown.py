from datetime import datetime
from typing import List

from sqlalchemy import delete
from sqlalchemy import distinct
from sqlalchemy import select
from sqlalchemy.dialects.sqlite import insert

from db.engine import AsyncSessionLocal

from db.models import (
    ChannelPermissionSnapshot,
    VerificationConfig,
)


# SECURITY ROLE DETECTION
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


# SINGLE SNAPSHOT


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

        stmt = insert(ChannelPermissionSnapshot).values(
            guild_id=guild_id,
            channel_id=channel_id,
            target_id=target_id,
            send_messages=send_messages,
            connect=connect,
            speak=speak,
            locked_by=actor_id,
            expires_at=expires_at,
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


# BULK SNAPSHOTS


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

            stmt = insert(ChannelPermissionSnapshot).values(
                guild_id=guild_id,
                channel_id=channel_id,
                target_id=target_id,
                send_messages=send_messages,
                connect=connect,
                speak=speak,
                locked_by=actor_id,
                expires_at=expires_at,
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


# FETCH SNAPSHOTS


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


# DELETE SNAPSHOTS


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

        return result.rowcount > 0 # type: ignore


# CHECK LOCK STATE

async def is_channel_locked(
    guild_id: int,
    channel_id: int,
) -> bool:

    async with AsyncSessionLocal() as session:

        return await session.scalar(
            select(ChannelPermissionSnapshot.channel_id).where(
                ChannelPermissionSnapshot.guild_id == guild_id,
                ChannelPermissionSnapshot.channel_id == channel_id,
            ).limit(1)) is not None


# FETCH LOCKED CHANNELS


async def get_locked_channels(guild_id: int, ) -> list[int]:

    async with AsyncSessionLocal() as session:

        result = await session.scalars(
            select(distinct(ChannelPermissionSnapshot.channel_id)).where(
                ChannelPermissionSnapshot.guild_id == guild_id))

        return list(result)


# FETCH EXPIRED SNAPSHOTS


async def get_expired_snapshots(
    now: datetime, ) -> List[ChannelPermissionSnapshot]:

    async with AsyncSessionLocal() as session:

        result = await session.scalars(
            select(ChannelPermissionSnapshot).where(
                ChannelPermissionSnapshot.expires_at.is_not(None),
                ChannelPermissionSnapshot.expires_at <= now,
            ))

        return list(result)
