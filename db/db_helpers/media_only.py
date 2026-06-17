from sqlalchemy import delete, select, update
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlalchemy.dialects.postgresql import insert as postgres_insert
from db.engine import AsyncSessionLocal, DB_TYPE
from db.models import MediaOnlyChannel


# Internal insert builder
def build_insert_stmt(model, values: dict):
    if DB_TYPE == "postgres":
        return postgres_insert(model).values(**values)
    return sqlite_insert(model).values(**values)


# Enable media only
async def enable_media_only(
    guild_id: int,
    channel_id: int,
    *,
    whitelist_role_id: int | None = None,
    image_only: bool = False,
    auto_mute: bool = False,
    nsfw_bypass: bool = True,
) -> bool:
    async with AsyncSessionLocal() as session:
        stmt = build_insert_stmt(
            MediaOnlyChannel,
            {
                "guild_id": guild_id,
                "channel_id": channel_id,
                "whitelist_role_id": whitelist_role_id,
                "image_only": image_only,
                "auto_mute": auto_mute,
                "nsfw_bypass": nsfw_bypass,
            },
        ).on_conflict_do_nothing(
            index_elements=[MediaOnlyChannel.guild_id, MediaOnlyChannel.channel_id]
        )

        result = await session.execute(stmt)
        await session.commit()
        return (getattr(result, "rowcount", 0) or 0) > 0


# Disable media only
async def disable_media_only(guild_id: int, channel_id: int) -> bool:
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            delete(MediaOnlyChannel).where(
                MediaOnlyChannel.guild_id == guild_id,
                MediaOnlyChannel.channel_id == channel_id,
            )
        )
        await session.commit()
        return (getattr(result, "rowcount", 0) or 0) > 0


# Fetch full config
async def get_media_only_config(
    guild_id: int, channel_id: int
) -> MediaOnlyChannel | None:
    async with AsyncSessionLocal() as session:
        return await session.scalar(
            select(MediaOnlyChannel).where(
                MediaOnlyChannel.guild_id == guild_id,
                MediaOnlyChannel.channel_id == channel_id,
            )
        )


# Simple check
async def is_media_only(guild_id: int, channel_id: int) -> bool:
    async with AsyncSessionLocal() as session:
        return (
            await session.scalar(
                select(MediaOnlyChannel.guild_id).where(
                    MediaOnlyChannel.guild_id == guild_id,
                    MediaOnlyChannel.channel_id == channel_id,
                )
            )
            is not None
        )


# Update sticky message id
async def update_sticky_message_id(
    guild_id: int, channel_id: int, message_id: int | None
) -> None:
    async with AsyncSessionLocal() as session:
        await session.execute(
            update(MediaOnlyChannel)
            .where(
                MediaOnlyChannel.guild_id == guild_id,
                MediaOnlyChannel.channel_id == channel_id,
            )
            .values(sticky_message_id=message_id)
        )
        await session.commit()


# Update settings
async def update_media_only_settings(
    guild_id: int,
    channel_id: int,
    *,
    whitelist_role_id: int | None = None,
    image_only: bool | None = None,
    auto_mute: bool | None = None,
    nsfw_bypass: bool | None = None,
) -> bool:
    # Direct dictionary comprehension to unpack only provided values cleanly
    values = {
        k: v
        for k, v in {
            "whitelist_role_id": whitelist_role_id,
            "image_only": image_only,
            "auto_mute": auto_mute,
            "nsfw_bypass": nsfw_bypass,
        }.items()
        if v is not None
    }

    if not values:
        return False

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            update(MediaOnlyChannel)
            .where(
                MediaOnlyChannel.guild_id == guild_id,
                MediaOnlyChannel.channel_id == channel_id,
            )
            .values(**values)
        )
        await session.commit()
        return (getattr(result, "rowcount", 0) or 0) > 0


# Fetch all media channels
async def get_media_only_channels(guild_id: int) -> list[int]:
    async with AsyncSessionLocal() as session:
        result = await session.scalars(
            select(MediaOnlyChannel.channel_id).where(
                MediaOnlyChannel.guild_id == guild_id
            )
        )
        return list(result)
