from typing import Optional
from sqlalchemy import select
from db.engine import AsyncSessionLocal
from db.models import StickyMessage

THRESHOLD = 1


async def set_sticky(guild_id: int, channel_id: int, content: str):
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(StickyMessage).where(
                StickyMessage.guild_id == guild_id,
                StickyMessage.channel_id == channel_id,
            ))

        sticky = result.scalar_one_or_none()

        if sticky:
            sticky.content = content
            sticky.counter = 0
            sticky.last_message_id = None
        else:
            session.add(
                StickyMessage(
                    guild_id=guild_id,
                    channel_id=channel_id,
                    content=content,
                    counter=0,
                    last_message_id=None,
                ))

        await session.commit()


async def remove_sticky(guild_id: int, channel_id: int) -> bool:
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(StickyMessage).where(
                StickyMessage.guild_id == guild_id,
                StickyMessage.channel_id == channel_id,
            ))

        sticky = result.scalar_one_or_none()
        if not sticky:
            return False

        await session.delete(sticky)
        await session.commit()
        return True


async def get_sticky(guild_id: int, channel_id: int) -> Optional[str]:
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(StickyMessage.content).where(
                StickyMessage.guild_id == guild_id,
                StickyMessage.channel_id == channel_id,
            ))

        row = result.first()
        return row[0] if row else None


async def sticky_step(
    guild_id: int,
    channel_id: int,
) -> tuple[str, int | None] | None:
    """
    Single atomic DB step for sticky repost logic.
    Returns (content, last_message_id) if repost needed.
    """

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(StickyMessage).where(
                StickyMessage.guild_id == guild_id,
                StickyMessage.channel_id == channel_id,
            ))

        sticky = result.scalar_one_or_none()
        if not sticky:
            return None

        sticky.counter += 1

        if sticky.counter < THRESHOLD:
            await session.commit()
            return None

        sticky.counter = 0
        last_id = sticky.last_message_id
        sticky.last_message_id = None

        content = sticky.content

        await session.commit()
        return content, last_id


async def update_last_message(
    guild_id: int,
    channel_id: int,
    message_id: int,
):
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(StickyMessage).where(
                StickyMessage.guild_id == guild_id,
                StickyMessage.channel_id == channel_id,
            ))

        sticky = result.scalar_one_or_none()
        if sticky:
            sticky.last_message_id = message_id
            await session.commit()
