from sqlalchemy import select, update
from db.engine import AsyncSessionLocal
from db.models import MediaOnlyChannel


# ENABLE MEDIA ONLY
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
        result = await session.execute(
            select(MediaOnlyChannel).where(
                MediaOnlyChannel.guild_id == guild_id,
                MediaOnlyChannel.channel_id == channel_id,
            ))

        exists = result.scalar_one_or_none()
        if exists:
            return False

        session.add(
            MediaOnlyChannel(
                guild_id=guild_id,
                channel_id=channel_id,
                whitelist_role_id=whitelist_role_id,
                image_only=image_only,
                auto_mute=auto_mute,
                nsfw_bypass=nsfw_bypass,
            ))

        await session.commit()
        return True


# DISABLE MEDIA ONLY
async def disable_media_only(guild_id: int, channel_id: int) -> bool:
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(MediaOnlyChannel).where(
                MediaOnlyChannel.guild_id == guild_id,
                MediaOnlyChannel.channel_id == channel_id,
            ))

        row = result.scalar_one_or_none()
        if not row:
            return False

        await session.delete(row)
        await session.commit()
        return True


# FETCH FULL CONFIG
async def get_media_only_config(
    guild_id: int,
    channel_id: int,
) -> MediaOnlyChannel | None:

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(MediaOnlyChannel).where(
                MediaOnlyChannel.guild_id == guild_id,
                MediaOnlyChannel.channel_id == channel_id,
            ))

        return result.scalar_one_or_none()


# SIMPLE CHECK
async def is_media_only(guild_id: int, channel_id: int) -> bool:
    config = await get_media_only_config(guild_id, channel_id)
    return config is not None


# UPDATE STICKY MESSAGE ID
async def update_sticky_message_id(
    guild_id: int,
    channel_id: int,
    message_id: int | None,
) -> None:

    async with AsyncSessionLocal() as session:
        await session.execute(
            update(MediaOnlyChannel).where(
                MediaOnlyChannel.guild_id == guild_id,
                MediaOnlyChannel.channel_id == channel_id,
            ).values(sticky_message_id=message_id))
        await session.commit()


# UPDATE SETTINGS
async def update_media_only_settings(
    guild_id: int,
    channel_id: int,
    *,
    whitelist_role_id: int | None = None,
    image_only: bool | None = None,
    auto_mute: bool | None = None,
    nsfw_bypass: bool | None = None,
) -> bool:

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(MediaOnlyChannel).where(
                MediaOnlyChannel.guild_id == guild_id,
                MediaOnlyChannel.channel_id == channel_id,
            ))

        row = result.scalar_one_or_none()
        if not row:
            return False

        if whitelist_role_id is not None:
            row.whitelist_role_id = whitelist_role_id

        if image_only is not None:
            row.image_only = image_only

        if auto_mute is not None:
            row.auto_mute = auto_mute

        if nsfw_bypass is not None:
            row.nsfw_bypass = nsfw_bypass

        await session.commit()
        return True
