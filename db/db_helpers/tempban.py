from datetime import datetime
from typing import Optional, List

from sqlalchemy import select, update
from db.engine import AsyncSessionLocal
from db.models import TempbanConfig, TempbanRecord


# region CONFIG
async def set_tempban_role(guild_id: int, role_id: int) -> None:
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(TempbanConfig).where(TempbanConfig.guild_id == guild_id))
        row = result.scalar_one_or_none()

        if row:
            row.role_id = role_id
        else:
            session.add(TempbanConfig(
                guild_id=guild_id,
                role_id=role_id,
            ))

        await session.commit()


async def get_tempban_role(guild_id: int) -> Optional[int]:
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(TempbanConfig.role_id).where(
                TempbanConfig.guild_id == guild_id))
        return result.scalar_one_or_none()


# region TEMPBAN ACTIONS
async def add_tempban(
    *,
    guild_id: int,
    user_id: int,
    moderator_id: int,
    reason: Optional[str] = None,
    expires_at: Optional[datetime] = None,
) -> None:

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(TempbanRecord).where(
                TempbanRecord.guild_id == guild_id,
                TempbanRecord.user_id == user_id,
            ))
        record = result.scalar_one_or_none()

        if record:
            record.moderator_id = moderator_id
            record.reason = reason
            record.expires_at = expires_at
            record.active = True
            record.created_at = datetime.utcnow()
        else:
            session.add(
                TempbanRecord(
                    guild_id=guild_id,
                    user_id=user_id,
                    moderator_id=moderator_id,
                    reason=reason,
                    expires_at=expires_at,
                    active=True,
                ))

        await session.commit()


async def remove_tempban(
    *,
    guild_id: int,
    user_id: int,
    moderator_id: int,
) -> bool:

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(TempbanRecord).where(
                TempbanRecord.guild_id == guild_id,
                TempbanRecord.user_id == user_id,
                TempbanRecord.active == True,
            ))
        record = result.scalar_one_or_none()

        if not record:
            return False

        record.active = False
        await session.commit()
        return True


async def is_tempbanned(guild_id: int, user_id: int) -> bool:
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(TempbanRecord.id).where(
                TempbanRecord.guild_id == guild_id,
                TempbanRecord.user_id == user_id,
                TempbanRecord.active == True,
            ))
        return result.scalar_one_or_none() is not None


async def get_active_tempbans(guild_id: int) -> List[TempbanRecord]:
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(TempbanRecord).where(
                TempbanRecord.guild_id == guild_id,
                TempbanRecord.active == True,
            ))
        return result.scalars().all()
