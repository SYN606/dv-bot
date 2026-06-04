from typing import List
from sqlalchemy import delete, select
from sqlalchemy.dialects.sqlite import (insert as sqlite_insert)
from sqlalchemy.dialects.postgresql import (insert as postgres_insert)
from db.engine import (AsyncSessionLocal, DB_DIALECT)
from db.models import AdminRole


# Internal insert builder
def build_insert_stmt(model, values: dict):
    if DB_DIALECT == "postgresql":
        return postgres_insert(model).values(**values)
    return sqlite_insert(model).values(**values)


# Add admin role
async def add_admin_role(guild_id: int, role_id: int) -> bool:
    async with AsyncSessionLocal() as session:
        stmt = build_insert_stmt(
            AdminRole,
            {
                "guild_id": guild_id,
                "role_id": role_id
            },
        )
        stmt = stmt.on_conflict_do_nothing(
            index_elements=[AdminRole.guild_id, AdminRole.role_id])
        result = await session.execute(stmt)
        await session.commit()
        return (getattr(result, "rowcount", 0) or 0) > 0


# Remove admin role
async def remove_admin_role(guild_id: int, role_id: int) -> bool:
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            delete(AdminRole).where(AdminRole.guild_id == guild_id,
                                    AdminRole.role_id == role_id))
        await session.commit()
        return (getattr(result, "rowcount", 0) or 0) > 0


# Fetch admin roles
async def get_admin_roles(guild_id: int, ) -> List[int]:
    async with AsyncSessionLocal() as session:
        result = await session.scalars(
            select(AdminRole.role_id).where(AdminRole.guild_id == guild_id))
        return list(result)


# Check admin role
async def is_admin_role(guild_id: int, role_id: int) -> bool:
    async with AsyncSessionLocal() as session:
        result = await session.scalar(
            select(AdminRole.guild_id).where(AdminRole.guild_id == guild_id,
                                             AdminRole.role_id == role_id))
        return result is not None
