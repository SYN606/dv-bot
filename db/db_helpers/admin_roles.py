from typing import List
from sqlalchemy import select
from db.engine import AsyncSessionLocal
from db.models import AdminRole


async def add_admin_role(guild_id: int, role_id: int) -> bool:
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(AdminRole).where(
                AdminRole.guild_id == guild_id,
                AdminRole.role_id == role_id,
            ))

        exists = result.scalar_one_or_none()
        if exists:
            return False

        session.add(AdminRole(guild_id=guild_id, role_id=role_id))
        await session.commit()
        return True


async def remove_admin_role(guild_id: int, role_id: int) -> bool:
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(AdminRole).where(
                AdminRole.guild_id == guild_id,
                AdminRole.role_id == role_id,
            ))

        role = result.scalar_one_or_none()
        if not role:
            return False

        await session.delete(role)
        await session.commit()
        return True


async def get_admin_roles(guild_id: int) -> List[int]:
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(AdminRole.role_id).where(AdminRole.guild_id == guild_id))

        return [row[0] for row in result.all()]
