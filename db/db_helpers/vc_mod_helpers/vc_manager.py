from sqlalchemy import delete, select, update
from sqlalchemy.dialects.sqlite import (
    insert as sqlite_insert, )
from sqlalchemy.dialects.postgresql import (
    insert as postgres_insert, )
from db.engine import (
    AsyncSessionLocal,
    DB_DIALECT,
)
from db.models import VCManagerConfig


# Internal insert builder
def build_insert_stmt(
    model,
    values: dict,
):
    if DB_DIALECT == "postgresql":
        return postgres_insert(model).values(**values)
    return sqlite_insert(model).values(**values)


# Set manager config
async def set_vc_manager_config(
    guild_id: int,
    *,
    panel_channel_id: int | None = None,
    panel_message_id: int | None = None,
    log_channel_id: int | None = None,
    enabled: bool = True,
) -> None:

    async with AsyncSessionLocal() as session:
        stmt = build_insert_stmt(
            VCManagerConfig,
            {
                "guild_id": guild_id,
                "panel_channel_id": panel_channel_id,
                "panel_message_id": panel_message_id,
                "log_channel_id": log_channel_id,
                "enabled": enabled,
            },
        )
        stmt = stmt.on_conflict_do_update(
            index_elements=[
                VCManagerConfig.guild_id,
            ],
            set_={
                "panel_channel_id": panel_channel_id,
                "panel_message_id": panel_message_id,
                "log_channel_id": log_channel_id,
                "enabled": enabled,
            },
        )
        await session.execute(stmt)
        await session.commit()


# Get manager config
async def get_vc_manager_config(guild_id: int, ) -> VCManagerConfig | None:
    async with AsyncSessionLocal() as session:
        return await session.scalar(
            select(VCManagerConfig).where(VCManagerConfig.guild_id == guild_id)
        )


# Check enabled
async def is_vc_manager_enabled(guild_id: int, ) -> bool:
    async with AsyncSessionLocal() as session:
        result = await session.scalar(
            select(VCManagerConfig.guild_id).where(
                VCManagerConfig.guild_id == guild_id,
                VCManagerConfig.enabled.is_(True),
            ))
        return result is not None


# Update panel
async def update_vc_panel(
    guild_id: int,
    *,
    panel_channel_id: int | None = None,
    panel_message_id: int | None = None,
) -> bool:

    values = {}
    if panel_channel_id is not None:
        values["panel_channel_id"] = panel_channel_id
    if panel_message_id is not None:
        values["panel_message_id"] = panel_message_id
    if not values:
        return False
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            update(VCManagerConfig).where(
                VCManagerConfig.guild_id == guild_id).values(**values))
        await session.commit()
        return (getattr(result, "rowcount", 0) or 0) > 0


# Update log channel
async def update_vc_log_channel(
    guild_id: int,
    channel_id: int | None,
) -> bool:
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            update(VCManagerConfig).where(
                VCManagerConfig.guild_id == guild_id).values(
                    log_channel_id=channel_id))
        await session.commit()
        return (getattr(result, "rowcount", 0) or 0) > 0


# Toggle drag
async def toggle_drag(
    guild_id: int,
    enabled: bool,
) -> bool:
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            update(VCManagerConfig).where(
                VCManagerConfig.guild_id == guild_id).values(
                    drag_enabled=enabled))

        await session.commit()
        return (getattr(result, "rowcount", 0) or 0) > 0


# Toggle drag all
async def toggle_drag_all(
    guild_id: int,
    enabled: bool,
) -> bool:
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            update(VCManagerConfig).where(
                VCManagerConfig.guild_id == guild_id).values(
                    drag_all_enabled=enabled))
        await session.commit()
        return (getattr(result, "rowcount", 0) or 0) > 0


# Toggle role sync
async def toggle_role_sync(
    guild_id: int,
    enabled: bool,
) -> bool:
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            update(VCManagerConfig).where(
                VCManagerConfig.guild_id == guild_id).values(
                    role_sync_enabled=enabled))
        await session.commit()
        return (getattr(result, "rowcount", 0) or 0) > 0


# Enable manager
async def enable_vc_manager(guild_id: int, ) -> bool:
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            update(VCManagerConfig).where(
                VCManagerConfig.guild_id == guild_id).values(enabled=True))
        await session.commit()
        return (getattr(result, "rowcount", 0) or 0) > 0


# Disable manager
async def disable_vc_manager(guild_id: int, ) -> bool:
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            update(VCManagerConfig).where(
                VCManagerConfig.guild_id == guild_id).values(enabled=False))
        await session.commit()
        return (getattr(result, "rowcount", 0) or 0) > 0


# Delete manager
async def delete_vc_manager(guild_id: int, ) -> bool:
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            delete(VCManagerConfig).where(VCManagerConfig.guild_id == guild_id)
        )
        await session.commit()
        return (getattr(result, "rowcount", 0) or 0) > 0
