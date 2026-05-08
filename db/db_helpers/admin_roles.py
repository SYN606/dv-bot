from typing import List

from sqlalchemy import delete
from sqlalchemy import select
from sqlalchemy.dialects.sqlite import insert

from db.engine import AsyncSessionLocal
from db.models import AdminRole


async def add_admin_role(
    guild_id: int,
    role_id: int,
) -> bool:

    async with AsyncSessionLocal() as session:

        stmt = insert(AdminRole).values(
            guild_id=guild_id,
            role_id=role_id,
        )

        stmt = stmt.on_conflict_do_nothing(index_elements=[
            AdminRole.guild_id,
            AdminRole.role_id,
        ])

        result = await session.execute(stmt)

        await session.commit()

        return result.rowcount > 0 # type: ignore


async def remove_admin_role(
    guild_id: int,
    role_id: int,
) -> bool:

    async with AsyncSessionLocal() as session:

        result = await session.execute(
            delete(AdminRole).where(
                AdminRole.guild_id == guild_id,
                AdminRole.role_id == role_id,
            ))

        await session.commit()

        return result.rowcount > 0  # type: ignore


async def get_admin_roles(guild_id: int, ) -> List[int]:

    async with AsyncSessionLocal() as session:

        result = await session.scalars(
            select(AdminRole.role_id).where(AdminRole.guild_id == guild_id))

        return list(result)


async def is_admin_role(
    guild_id: int,
    role_id: int,
) -> bool:

    async with AsyncSessionLocal() as session:

        return await session.scalar(
            select(AdminRole.guild_id).where(
                AdminRole.guild_id == guild_id,
                AdminRole.role_id == role_id,
            )) is not None
