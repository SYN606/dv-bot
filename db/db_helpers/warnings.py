from typing import List, Tuple
from sqlalchemy import delete, select, func
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlalchemy.dialects.postgresql import insert as postgres_insert
from db.engine import AsyncSessionLocal, DB_TYPE
from db.models import WarningRecord


# Internal cross-dialect insert constructor
def build_insert_stmt(model, values: dict):
    if DB_TYPE == "postgres":
        return postgres_insert(model).values(**values)
    return sqlite_insert(model).values(**values)


# Create/Issue a warning
async def add_warning(
    guild_id: int, user_id: int, moderator_id: int, reason: str
) -> Tuple[bool, int]:
    async with AsyncSessionLocal() as session:
        stmt = build_insert_stmt(
            WarningRecord,
            {
                "guild_id": guild_id,
                "user_id": user_id,
                "moderator_id": moderator_id,
                "reason": reason,
            },
        )
        await session.execute(stmt)
        total_warns = (
            await session.scalar(
                select(func.count(WarningRecord.warn_id)).where(
                    WarningRecord.guild_id == guild_id, WarningRecord.user_id == user_id
                )
            )
            or 0
        )

        await session.commit()
        return True, total_warns


# Fetch warning logs history for a member
async def get_warnings(guild_id: int, user_id: int) -> List[WarningRecord]:
    async with AsyncSessionLocal() as session:
        result = await session.scalars(
            select(WarningRecord)
            .where(WarningRecord.guild_id == guild_id, WarningRecord.user_id == user_id)
            .order_by(WarningRecord.created_at.desc())
        )
        return list(result)


# Delete a single warning index item
async def delete_warning_by_id(guild_id: int, warn_id: int) -> Tuple[bool, int, str]:
    async with AsyncSessionLocal() as session:
        record = (
            await session.execute(
                select(WarningRecord.user_id, WarningRecord.reason).where(
                    WarningRecord.warn_id == warn_id, WarningRecord.guild_id == guild_id
                )
            )
        ).fetchone()

        if not record:
            return False, 0, ""

        user_id, reason = record
        await session.execute(
            delete(WarningRecord).where(
                WarningRecord.warn_id == warn_id, WarningRecord.guild_id == guild_id
            )
        )
        await session.commit()
        return True, user_id, reason


# Wipe full history log configuration data
async def clear_all_warnings(guild_id: int, user_id: int) -> bool:
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            delete(WarningRecord).where(
                WarningRecord.guild_id == guild_id, WarningRecord.user_id == user_id
            )
        )
        await session.commit()
        return (getattr(result, "rowcount", 0) or 0) > 0
