from sqlalchemy import delete, select, update

from sqlalchemy.dialects.sqlite import (
    insert as sqlite_insert, )

from sqlalchemy.dialects.postgresql import (
    insert as postgres_insert, )

from db.engine import (
    AsyncSessionLocal,
    DB_DIALECT,
)

from db.models import VCTrackedChannel


# Internal insert builder
def build_insert_stmt(
    model,
    values: dict,
):

    if DB_DIALECT == "postgresql":
        return postgres_insert(model).values(**values)

    return sqlite_insert(model).values(**values)


# Add tracked channel
async def add_tracked_channel(
    guild_id: int,
    channel_id: int,
    role_id: int,
    *,
    auto_role: bool = True,
    drag_allowed: bool = True,
    managed_role: bool = True,
) -> bool:

    async with AsyncSessionLocal() as session:

        stmt = build_insert_stmt(
            VCTrackedChannel,
            {
                "guild_id": guild_id,
                "channel_id": channel_id,
                "role_id": role_id,
                "enabled": True,
                "auto_role": auto_role,
                "drag_allowed": drag_allowed,
                "managed_role": managed_role,
            },
        )

        stmt = stmt.on_conflict_do_update(
            index_elements=[
                VCTrackedChannel.guild_id,
                VCTrackedChannel.channel_id,
            ],
            set_={
                "role_id": role_id,
                "enabled": True,
                "auto_role": auto_role,
                "drag_allowed": drag_allowed,
                "managed_role": managed_role,
            },
        )

        result = await session.execute(stmt)

        await session.commit()

        return (getattr(result, "rowcount", 0) or 0) > 0


# Remove tracked channel
async def remove_tracked_channel(
    guild_id: int,
    channel_id: int,
) -> bool:

    async with AsyncSessionLocal() as session:

        result = await session.execute(
            delete(VCTrackedChannel).where(
                VCTrackedChannel.guild_id == guild_id,
                VCTrackedChannel.channel_id == channel_id,
            ))

        await session.commit()

        return (getattr(result, "rowcount", 0) or 0) > 0


# Get tracked role
async def get_tracked_role(
    guild_id: int,
    channel_id: int,
) -> int | None:

    async with AsyncSessionLocal() as session:

        return await session.scalar(
            select(VCTrackedChannel.role_id).where(
                VCTrackedChannel.guild_id == guild_id,
                VCTrackedChannel.channel_id == channel_id,
                VCTrackedChannel.enabled.is_(True),
            ))


# Get tracked channel
async def get_tracked_channel(
    guild_id: int,
    role_id: int,
) -> int | None:

    async with AsyncSessionLocal() as session:

        return await session.scalar(
            select(VCTrackedChannel.channel_id).where(
                VCTrackedChannel.guild_id == guild_id,
                VCTrackedChannel.role_id == role_id,
                VCTrackedChannel.enabled.is_(True),
            ))


# Fetch guild tracked channels
async def get_guild_tracked_channels(
    guild_id: int, ) -> list[VCTrackedChannel]:

    async with AsyncSessionLocal() as session:

        result = await session.scalars(
            select(VCTrackedChannel).where(
                VCTrackedChannel.guild_id == guild_id))

        return list(result)


# Check tracked channel
async def is_channel_tracked(
    guild_id: int,
    channel_id: int,
) -> bool:

    async with AsyncSessionLocal() as session:

        result = await session.scalar(
            select(VCTrackedChannel.guild_id).where(
                VCTrackedChannel.guild_id == guild_id,
                VCTrackedChannel.channel_id == channel_id,
            ))

        return result is not None


# Toggle channel tracking
async def toggle_channel_tracking(
    guild_id: int,
    channel_id: int,
    enabled: bool,
) -> bool:

    async with AsyncSessionLocal() as session:

        result = await session.execute(
            update(VCTrackedChannel).where(
                VCTrackedChannel.guild_id == guild_id,
                VCTrackedChannel.channel_id == channel_id,
            ).values(enabled=enabled))

        await session.commit()

        return (getattr(result, "rowcount", 0) or 0) > 0


# Toggle auto role
async def toggle_auto_role(
    guild_id: int,
    channel_id: int,
    enabled: bool,
) -> bool:

    async with AsyncSessionLocal() as session:

        result = await session.execute(
            update(VCTrackedChannel).where(
                VCTrackedChannel.guild_id == guild_id,
                VCTrackedChannel.channel_id == channel_id,
            ).values(auto_role=enabled))

        await session.commit()

        return (getattr(result, "rowcount", 0) or 0) > 0


# Toggle drag allowed
async def toggle_drag_allowed(
    guild_id: int,
    channel_id: int,
    enabled: bool,
) -> bool:

    async with AsyncSessionLocal() as session:

        result = await session.execute(
            update(VCTrackedChannel).where(
                VCTrackedChannel.guild_id == guild_id,
                VCTrackedChannel.channel_id == channel_id,
            ).values(drag_allowed=enabled))

        await session.commit()

        return (getattr(result, "rowcount", 0) or 0) > 0


# Get role from channel
async def get_role_from_channel(
    guild_id: int,
    channel_id: int,
) -> int | None:

    return await get_tracked_role(
        guild_id,
        channel_id,
    )


# Get channel from role
async def get_channel_from_role(
    guild_id: int,
    role_id: int,
) -> int | None:

    return await get_tracked_channel(
        guild_id,
        role_id,
    )
