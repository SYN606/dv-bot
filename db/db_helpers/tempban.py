from datetime import datetime
from typing import List, Optional
from sqlalchemy import select, update
from sqlalchemy.dialects.sqlite import (
    insert as sqlite_insert, )
from sqlalchemy.dialects.postgresql import (
    insert as postgres_insert, )
from db.engine import (
    AsyncSessionLocal,
    DB_DIALECT,
)
from db.models import (
    TempbanConfig,
    TempbanRecord,
)

# Internal upsert builder
def build_insert_stmt(
    model,
    values: dict,
):

    if DB_DIALECT == "postgresql":
        return postgres_insert(model).values(**values)
    return sqlite_insert(model).values(**values)


# Set tempban role
async def set_tempban_role(
    guild_id: int,
    role_id: int,
) -> None:
    async with AsyncSessionLocal() as session:
        stmt = build_insert_stmt(
            TempbanConfig,
            {
                "guild_id": guild_id,
                "role_id": role_id,
            },
        )
        stmt = stmt.on_conflict_do_update(
            index_elements=[
                TempbanConfig.guild_id,
            ],
            set_={
                "role_id": role_id,
            },
        )

        await session.execute(stmt)
        await session.commit()


# Get tempban role
async def get_tempban_role(guild_id: int, ) -> Optional[int]:

    async with AsyncSessionLocal() as session:

        return await session.scalar(
            select(TempbanConfig.role_id).where(
                TempbanConfig.guild_id == guild_id))


# Add tempban
async def add_tempban(
    *,
    guild_id: int,
    user_id: int,
    moderator_id: int,
    reason: Optional[str] = None,
    expires_at: Optional[datetime] = None,
) -> None:

    async with AsyncSessionLocal() as session:

        stmt = build_insert_stmt(
            TempbanRecord,
            {
                "guild_id": guild_id,
                "user_id": user_id,
                "moderator_id": moderator_id,
                "tempban_reason": reason,
                "expires_at": expires_at,
                "active": True,
            },
        )

        stmt = stmt.on_conflict_do_update(
            index_elements=[
                TempbanRecord.guild_id,
                TempbanRecord.user_id,
            ],
            set_={
                "moderator_id": moderator_id,
                "tempban_reason": reason,
                "expires_at": expires_at,
                "active": True,
                "updated_at": datetime.utcnow(),
            },
        )

        await session.execute(stmt)
        await session.commit()


# Remove tempban
async def remove_tempban(
    *,
    guild_id: int,
    user_id: int,
    moderator_id: int,
) -> bool:

    async with AsyncSessionLocal() as session:

        result = await session.execute(
            update(TempbanRecord).where(
                TempbanRecord.guild_id == guild_id,
                TempbanRecord.user_id == user_id,
                TempbanRecord.active.is_(True),
            ).values(
                active=False,
                moderator_id=moderator_id,
                updated_at=datetime.utcnow(),
            ))

        await session.commit()

        return (getattr(result, "rowcount", 0) or 0) > 0


# Check tempban status
async def is_tempbanned(
    guild_id: int,
    user_id: int,
) -> bool:

    async with AsyncSessionLocal() as session:

        result = await session.scalar(
            select(TempbanRecord.guild_id).where(
                TempbanRecord.guild_id == guild_id,
                TempbanRecord.user_id == user_id,
                TempbanRecord.active.is_(True),
            ))

        return result is not None


# Fetch active tempbans
async def get_active_tempbans(guild_id: int, ) -> List[TempbanRecord]:

    async with AsyncSessionLocal() as session:

        result = await session.scalars(
            select(TempbanRecord).where(
                TempbanRecord.guild_id == guild_id,
                TempbanRecord.active.is_(True),
            ))

        return list(result)


# Fetch expired tempbans
async def get_expired_tempbans() -> List[TempbanRecord]:

    async with AsyncSessionLocal() as session:

        result = await session.scalars(
            select(TempbanRecord).where(
                TempbanRecord.active.is_(True),
                TempbanRecord.expires_at.is_not(None),
                TempbanRecord.expires_at <= datetime.utcnow(),
            ))

        return list(result)
