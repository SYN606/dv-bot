from sqlalchemy import (
    delete,
    select,
    update,
)

from sqlalchemy.dialects.postgresql import (
    insert as postgres_insert,
)

from sqlalchemy.dialects.sqlite import (
    insert as sqlite_insert,
)

from db.engine import (
    AsyncSessionLocal,
    DB_DIALECT,
)

from db.models import (
    VCManagerConfig,
)


# Internal insert builder
def build_insert_stmt(
    model,
    values: dict,
):

    if DB_DIALECT == "postgresql":
        return postgres_insert(
            model,
        ).values(
            **values,
        )

    return sqlite_insert(
        model,
    ).values(
        **values,
    )


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

        await session.execute(
            stmt,
        )

        await session.commit()

        print(f"[VC MANAGER] Config updated for {guild_id}")


# Get manager config
async def get_vc_manager_config(
    guild_id: int,
) -> VCManagerConfig | None:

    async with AsyncSessionLocal() as session:
        return await session.scalar(
            select(VCManagerConfig).where(
                VCManagerConfig.guild_id == guild_id,
            )
        )


# Check enabled
async def is_vc_manager_enabled(
    guild_id: int,
) -> bool:

    async with AsyncSessionLocal() as session:
        result = await session.scalar(
            select(
                VCManagerConfig.guild_id,
            ).where(
                VCManagerConfig.guild_id == guild_id,
                VCManagerConfig.enabled.is_(True),
            )
        )

        enabled = result is not None

        print(f"[VC MANAGER] Guild={guild_id} Enabled={enabled}")

        return enabled


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
            update(VCManagerConfig)
            .where(
                VCManagerConfig.guild_id == guild_id,
            )
            .values(
                **values,
            )
        )

        await session.commit()

        updated = (getattr(result, "rowcount", 0) or 0) > 0

        print(f"[VC MANAGER] Panel updated={updated}")

        return updated


# Update log channel
async def update_vc_log_channel(
    guild_id: int,
    channel_id: int | None,
) -> bool:

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            update(VCManagerConfig)
            .where(
                VCManagerConfig.guild_id == guild_id,
            )
            .values(
                log_channel_id=channel_id,
            )
        )

        await session.commit()

        updated = (getattr(result, "rowcount", 0) or 0) > 0

        print(f"[VC MANAGER] Log channel updated={updated}")

        return updated


# Toggle drag
async def toggle_drag(
    guild_id: int,
    enabled: bool,
) -> bool:

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            update(VCManagerConfig)
            .where(
                VCManagerConfig.guild_id == guild_id,
            )
            .values(
                drag_enabled=enabled,
            )
        )

        await session.commit()

        updated = (getattr(result, "rowcount", 0) or 0) > 0

        print(f"[VC MANAGER] Drag enabled={enabled}")

        return updated


# Toggle drag all
async def toggle_drag_all(
    guild_id: int,
    enabled: bool,
) -> bool:

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            update(VCManagerConfig)
            .where(
                VCManagerConfig.guild_id == guild_id,
            )
            .values(
                drag_all_enabled=enabled,
            )
        )

        await session.commit()

        updated = (getattr(result, "rowcount", 0) or 0) > 0

        print(f"[VC MANAGER] Drag all enabled={enabled}")

        return updated


# Toggle role sync
async def toggle_role_sync(
    guild_id: int,
    enabled: bool,
) -> bool:

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            update(VCManagerConfig)
            .where(
                VCManagerConfig.guild_id == guild_id,
            )
            .values(
                role_sync_enabled=enabled,
            )
        )

        await session.commit()

        updated = (getattr(result, "rowcount", 0) or 0) > 0

        print(f"[VC MANAGER] Role sync enabled={enabled}")

        return updated


# Enable manager
async def enable_vc_manager(
    guild_id: int,
) -> bool:

    async with AsyncSessionLocal() as session:
        existing = await session.scalar(
            select(VCManagerConfig).where(
                VCManagerConfig.guild_id == guild_id,
            )
        )

        # Create config if missing
        if not existing:
            session.add(
                VCManagerConfig(
                    guild_id=guild_id,
                    enabled=True,
                )
            )

            await session.commit()

            print(f"[VC MANAGER] Created config for {guild_id}")

            return True

        # Update existing config
        result = await session.execute(
            update(VCManagerConfig)
            .where(
                VCManagerConfig.guild_id == guild_id,
            )
            .values(
                enabled=True,
            )
        )

        await session.commit()

        updated = (getattr(result, "rowcount", 0) or 0) > 0

        print(f"[VC MANAGER] Enabled for {guild_id}")

        return updated


# Disable manager
async def disable_vc_manager(
    guild_id: int,
) -> bool:

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            update(VCManagerConfig)
            .where(
                VCManagerConfig.guild_id == guild_id,
            )
            .values(
                enabled=False,
            )
        )

        await session.commit()

        updated = (getattr(result, "rowcount", 0) or 0) > 0

        print(f"[VC MANAGER] Disabled for {guild_id}")

        return updated


# Delete manager
async def delete_vc_manager(
    guild_id: int,
) -> bool:

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            delete(VCManagerConfig).where(
                VCManagerConfig.guild_id == guild_id,
            )
        )

        await session.commit()

        deleted = (getattr(result, "rowcount", 0) or 0) > 0

        print(f"[VC MANAGER] Deleted config={deleted}")

        return deleted
