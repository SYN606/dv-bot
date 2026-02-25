from sqlalchemy import select
from db.engine import AsyncSessionLocal
from db.models import MediaOnlyChannel


async def enable_media_only(guild_id: int, channel_id: int) -> bool:
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
            ))

        await session.commit()
        return True


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


async def is_media_only(guild_id: int, channel_id: int) -> bool:
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(MediaOnlyChannel).where(
                MediaOnlyChannel.guild_id == guild_id,
                MediaOnlyChannel.channel_id == channel_id,
            ))

        return result.scalar_one_or_none() is not None
