from sqlalchemy import delete, select, update
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlalchemy.dialects.postgresql import insert as postgres_insert
from db.engine import AsyncSessionLocal, DB_DIALECT
from db.models import VerificationConfig


# Internal upsert statement builder
def build_upsert_stmt(*,
                      guild_id: int,
                      verify_channel_id: int | None = None,
                      log_channel_id: int | None = None,
                      verified_role_id: int | None = None,
                      unverified_role_id: int | None = None):
    values = {
        "guild_id": guild_id,
        "verify_channel_id": verify_channel_id,
        "log_channel_id": log_channel_id,
        "verified_role_id": verified_role_id,
        "unverified_role_id": unverified_role_id
    }
    if DB_DIALECT == "postgresql":
        stmt = postgres_insert(VerificationConfig).values(**values)
    else:
        stmt = sqlite_insert(VerificationConfig).values(**values)
    stmt = stmt.on_conflict_do_update(
        index_elements=[VerificationConfig.guild_id],
        set_={
            "verify_channel_id": verify_channel_id,
            "log_channel_id": log_channel_id,
            "verified_role_id": verified_role_id,
            "unverified_role_id": unverified_role_id
        })
    return stmt


# Set configuration setup
async def set_verification_config(
        *,
        guild_id: int,
        verify_channel_id: int | None = None,
        log_channel_id: int | None = None,
        verified_role_id: int | None = None,
        unverified_role_id: int | None = None) -> None:
    async with AsyncSessionLocal() as session:
        stmt = build_upsert_stmt(guild_id=guild_id,
                                 verify_channel_id=verify_channel_id,
                                 log_channel_id=log_channel_id,
                                 verified_role_id=verified_role_id,
                                 unverified_role_id=unverified_role_id)
        await session.execute(stmt)
        await session.commit()


# Get full config model context
async def get_verification_config(guild_id: int) -> VerificationConfig | None:
    async with AsyncSessionLocal() as session:
        return await session.scalar(
            select(VerificationConfig).where(
                VerificationConfig.guild_id == guild_id))


# Check if guild is configured
async def is_verification_configured(guild_id: int) -> bool:
    async with AsyncSessionLocal() as session:
        result = await session.scalar(
            select(VerificationConfig.guild_id).where(
                VerificationConfig.guild_id == guild_id))
        return result is not None


# Delete config records completely
async def delete_verification_config(guild_id: int) -> bool:
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            delete(VerificationConfig).where(
                VerificationConfig.guild_id == guild_id))
        await session.commit()
        return (getattr(result, "rowcount", 0) or 0) > 0


# Update verified target role flag
async def update_verified_role(guild_id: int, role_id: int | None) -> bool:
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            update(VerificationConfig).where(
                VerificationConfig.guild_id == guild_id).values(
                    verified_role_id=role_id))
        await session.commit()
        return (getattr(result, "rowcount", 0) or 0) > 0


# Update unverified target role flag
async def update_unverified_role(guild_id: int, role_id: int | None) -> bool:
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            update(VerificationConfig).where(
                VerificationConfig.guild_id == guild_id).values(
                    unverified_role_id=role_id))
        await session.commit()
        return (getattr(result, "rowcount", 0) or 0) > 0
