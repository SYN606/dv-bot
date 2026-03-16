from sqlalchemy import select, delete

from db.engine import AsyncSessionLocal
from db.models import (
    ChannelPermissionSnapshot,
    VerificationConfig,
)


# ─────────────────────────
# SECURITY ROLE DETECTION
# ─────────────────────────
async def get_security_roles(guild) -> list[int]:
    """
    Returns role IDs that should be affected by lockdown.

    Rules:
    - Always include @everyone
    - Include verified role if verification enabled
    - Include unverified role if configured
    """

    roles: list[int] = [guild.default_role.id]

    async with AsyncSessionLocal() as session:

        stmt = select(VerificationConfig).where(
            VerificationConfig.guild_id == guild.id)

        result = await session.execute(stmt)

        config = result.scalar_one_or_none()

        if config:

            if config.verified_role_id:
                roles.append(config.verified_role_id)

            if config.unverified_role_id:
                roles.append(config.unverified_role_id)

    return roles


# ─────────────────────────
# CREATE SNAPSHOT (single overwrite)
# ─────────────────────────
async def set_permission_snapshot(
    guild_id: int,
    channel_id: int,
    target_id: int,
    send_messages: bool | None,
    actor_id: int,
) -> None:

    async with AsyncSessionLocal() as session:

        snapshot = ChannelPermissionSnapshot(
            guild_id=guild_id,
            channel_id=channel_id,
            target_id=target_id,
            send_messages=send_messages,
            locked_by=actor_id,
        )

        session.add(snapshot)
        await session.commit()


# ─────────────────────────
# BULK SNAPSHOT
# ─────────────────────────
async def set_permission_snapshots(
    guild_id: int,
    channel_id: int,
    snapshots: list[tuple[int, bool | None]],
    actor_id: int,
) -> None:

    async with AsyncSessionLocal() as session:

        rows = [
            ChannelPermissionSnapshot(
                guild_id=guild_id,
                channel_id=channel_id,
                target_id=target_id,
                send_messages=send_messages,
                locked_by=actor_id,
            ) for target_id, send_messages in snapshots
        ]

        session.add_all(rows)

        await session.commit()


# ─────────────────────────
# GET SNAPSHOTS
# ─────────────────────────
async def get_permission_snapshots(
    guild_id: int,
    channel_id: int,
) -> list[ChannelPermissionSnapshot]:

    async with AsyncSessionLocal() as session:

        stmt = select(ChannelPermissionSnapshot).where(
            ChannelPermissionSnapshot.guild_id == guild_id,
            ChannelPermissionSnapshot.channel_id == channel_id,
        )

        result = await session.execute(stmt)

        return list(result.scalars().all())


# ─────────────────────────
# DELETE SNAPSHOTS
# ─────────────────────────
async def remove_permission_snapshots(
    guild_id: int,
    channel_id: int,
) -> bool:

    async with AsyncSessionLocal() as session:

        stmt = delete(ChannelPermissionSnapshot).where(
            ChannelPermissionSnapshot.guild_id == guild_id,
            ChannelPermissionSnapshot.channel_id == channel_id,
        )

        result = await session.execute(stmt)

        await session.commit()

        return bool(result.rowcount) # type: ignore


# ─────────────────────────
# CHECK IF CHANNEL LOCKED
# ─────────────────────────
async def is_channel_locked(
    guild_id: int,
    channel_id: int,
) -> bool:

    async with AsyncSessionLocal() as session:

        stmt = select(ChannelPermissionSnapshot.channel_id).where(
            ChannelPermissionSnapshot.guild_id == guild_id,
            ChannelPermissionSnapshot.channel_id == channel_id,
        ).limit(1)

        result = await session.execute(stmt)

        return result.scalar_one_or_none() is not None


# ─────────────────────────
# GET LOCKED CHANNELS
# ─────────────────────────
async def get_locked_channels(guild_id: int) -> list[int]:

    async with AsyncSessionLocal() as session:

        stmt = select(ChannelPermissionSnapshot.channel_id).where(
            ChannelPermissionSnapshot.guild_id == guild_id)

        result = await session.execute(stmt)

        return list({row[0] for row in result.all()})
