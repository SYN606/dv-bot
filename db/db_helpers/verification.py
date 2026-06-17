from sqlalchemy import delete, select, update
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlalchemy.dialects.postgresql import insert as postgres_insert
from db.engine import AsyncSessionLocal, DB_TYPE
from db.models import VerificationConfig


def build_upsert_stmt(
    *,
    guild_id: int,
    verify_channel_id: int | None = None,
    log_channel_id: int | None = None,
    verified_role_id: int | None = None,
    unverified_role_id: int | None = None,
):
    values = {
        "guild_id": guild_id,
        "verify_channel_id": verify_channel_id,
        "log_channel_id": log_channel_id,
        "verified_role_id": verified_role_id,
        "unverified_role_id": unverified_role_id,
    }

    stmt = (
        postgres_insert(VerificationConfig).values(**values)
        if DB_TYPE == "postgres"
        else sqlite_insert(VerificationConfig).values(**values)
    )

    update_set = {k: v for k, v in values.items() if v is not None and k != "guild_id"}
    return stmt.on_conflict_do_update(
        index_elements=[VerificationConfig.guild_id],
        set_=update_set
        if update_set
        else {k: v for k, v in values.items() if k != "guild_id"},
    )


async def set_verification_config(
    *,
    guild_id: int,
    verify_channel_id: int | None = None,
    log_channel_id: int | None = None,
    verified_role_id: int | None = None,
    unverified_role_id: int | None = None,
) -> None:
    async with AsyncSessionLocal() as session:
        stmt = build_upsert_stmt(
            guild_id=guild_id,
            verify_channel_id=verify_channel_id,
            log_channel_id=log_channel_id,
            verified_role_id=verified_role_id,
            unverified_role_id=unverified_role_id,
        )
        await session.execute(stmt)
        await session.commit()


async def get_verification_config(guild_id: int) -> VerificationConfig | None:
    async with AsyncSessionLocal() as session:
        return await session.scalar(
            select(VerificationConfig).where(VerificationConfig.guild_id == guild_id)
        )


async def is_verification_configured(guild_id: int) -> bool:
    async with AsyncSessionLocal() as session:
        return (
            await session.scalar(
                select(VerificationConfig.guild_id).where(
                    VerificationConfig.guild_id == guild_id
                )
            )
            is not None
        )

async def delete_verification_config(guild_id: int) -> bool:
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            delete(VerificationConfig).where(VerificationConfig.guild_id == guild_id)
        )
        await session.commit()
        return (getattr(result, "rowcount", 0) or 0) > 0

async def update_verified_role(guild_id: int, role_id: int | None) -> bool:
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            update(VerificationConfig)
            .where(VerificationConfig.guild_id == guild_id)
            .values(verified_role_id=role_id)
        )
        await session.commit()
        return (getattr(result, "rowcount", 0) or 0) > 0


async def update_unverified_role(guild_id: int, role_id: int | None) -> bool:
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            update(VerificationConfig)
            .where(VerificationConfig.guild_id == guild_id)
            .values(unverified_role_id=role_id)
        )
        await session.commit()
        return (getattr(result, "rowcount", 0) or 0) > 0
