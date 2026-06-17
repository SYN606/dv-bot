from typing import Optional, Tuple
from sqlalchemy import delete, select, update
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlalchemy.dialects.postgresql import insert as postgres_insert
from db.engine import AsyncSessionLocal, DB_TYPE
from db.models import StickyMessage

THRESHOLD = 1


# Internal insert builder
def build_insert_stmt(model, values: dict):
    if DB_TYPE == "postgres":
        return postgres_insert(model).values(**values)
    return sqlite_insert(model).values(**values)


# Set sticky
async def set_sticky(guild_id: int, channel_id: int, content: str) -> None:
    async with AsyncSessionLocal() as session:
        payload = {
            "guild_id": guild_id,
            "channel_id": channel_id,
            "sticky_content": content,
            "counter": 0,
            "last_message_id": None,
        }

        stmt = build_insert_stmt(StickyMessage, payload).on_conflict_do_update(
            index_elements=[StickyMessage.guild_id, StickyMessage.channel_id],
            set_={"sticky_content": content, "counter": 0, "last_message_id": None},
        )
        await session.execute(stmt)
        await session.commit()


# Remove sticky
async def remove_sticky(guild_id: int, channel_id: int) -> bool:
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            delete(StickyMessage).where(
                StickyMessage.guild_id == guild_id,
                StickyMessage.channel_id == channel_id,
            )
        )
        await session.commit()
        return (getattr(result, "rowcount", 0) or 0) > 0


# Get sticky
async def get_sticky(guild_id: int, channel_id: int) -> Optional[str]:
    async with AsyncSessionLocal() as session:
        return await session.scalar(
            select(StickyMessage.sticky_content).where(
                StickyMessage.guild_id == guild_id,
                StickyMessage.channel_id == channel_id,
            )
        )


# Sticky repost step
async def sticky_step(
    guild_id: int, channel_id: int
) -> Optional[Tuple[str, Optional[int]]]:
    async with AsyncSessionLocal() as session:
        sticky = await session.scalar(
            select(StickyMessage).where(
                StickyMessage.guild_id == guild_id,
                StickyMessage.channel_id == channel_id,
            )
        )
        if not sticky:
            return None

        counter = sticky.counter + 1
        if counter < THRESHOLD:
            await session.execute(
                update(StickyMessage)
                .where(
                    StickyMessage.guild_id == guild_id,
                    StickyMessage.channel_id == channel_id,
                )
                .values(counter=counter)
            )
            await session.commit()
            return None

        # Repost threshold met: extract values and clear out the state tracking inline
        content = sticky.sticky_content
        last_message_id = sticky.last_message_id

        await session.execute(
            update(StickyMessage)
            .where(
                StickyMessage.guild_id == guild_id,
                StickyMessage.channel_id == channel_id,
            )
            .values(counter=0, last_message_id=None)
        )
        await session.commit()
        return content, last_message_id


# Update last sticky message
async def update_last_message(guild_id: int, channel_id: int, message_id: int) -> None:
    async with AsyncSessionLocal() as session:
        await session.execute(
            update(StickyMessage)
            .where(
                StickyMessage.guild_id == guild_id,
                StickyMessage.channel_id == channel_id,
            )
            .values(last_message_id=message_id)
        )
        await session.commit()
