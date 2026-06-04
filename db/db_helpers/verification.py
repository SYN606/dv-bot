from sqlalchemy import delete, select, update
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlalchemy.dialects.postgresql import insert as postgres_insert
from db.engine import AsyncSessionLocal, DB_DIALECT
from db.models import VerificationConfig


# Internal upsert builder
def build_upsert_stmt(*,
                      guild_id: int,
                      verify_channel_id: int | None = None,
                      log_channel_id: int | None = None,
                      verified_role_id: int | None = None,
                      unverified_role_id: int | None = None,
                      verification_message_id: int | None = None):

    values = {
        "guild_id": guild_id,
        "verify_channel_id": verify_channel_id,
        "log_channel_id": log_channel_id,
        "verified_role_id": verified_role_id,
        "unverified_role_id": unverified_role_id,
        "verification_message_id": verification_message_id
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
            "unverified_role_id": unverified_role_id,
            "verification_message_id": verification_message_id
        },
    )
    return stmt


# Set config
async def set_verification_config(
        *,
        guild_id: int,
        verify_channel_id: int | None = None,
        log_channel_id: int | None = None,
        verified_role_id: int | None = None,
        unverified_role_id: int | None = None,
        verification_message_id: int | None = None) -> None:

    async with AsyncSessionLocal() as session:

        stmt = build_upsert_stmt(
            guild_id=guild_id,
            verify_channel_id=verify_channel_id,
            log_channel_id=log_channel_id,
            verified_role_id=verified_role_id,
            unverified_role_id=unverified_role_id,
            verification_message_id=verification_message_id)

        await session.execute(stmt)
        await session.commit()


# Get full config
async def get_verification_config(
    guild_id: int, ) -> VerificationConfig | None:
    async with AsyncSessionLocal() as session:
        return await session.scalar(
            select(VerificationConfig).where(
                VerificationConfig.guild_id == guild_id))


# Check configured
async def is_verification_configured(guild_id: int, ) -> bool:
    async with AsyncSessionLocal() as session:
        result = await session.scalar(
            select(VerificationConfig.guild_id).where(
                VerificationConfig.guild_id == guild_id))

        return result is not None


# Delete config
async def delete_verification_config(guild_id: int, ) -> bool:

    async with AsyncSessionLocal() as session:

        result = await session.execute(
            delete(VerificationConfig).where(
                VerificationConfig.guild_id == guild_id))

        await session.commit()

        return (getattr(result, "rowcount", 0) or 0) > 0


# Update verification message
async def update_verification_message(guild_id: int,
                                      message_id: int | None) -> bool:

    async with AsyncSessionLocal() as session:

        result = await session.execute(
            update(VerificationConfig).where(
                VerificationConfig.guild_id == guild_id).values(
                    verification_message_id=message_id))

        await session.commit()
        return (getattr(result, "rowcount", 0) or 0) > 0


# Fetch verification message
async def get_verification_message(guild_id: int, ) -> int | None:

    async with AsyncSessionLocal() as session:
        return await session.scalar(
            select(VerificationConfig.verification_message_id).where(
                VerificationConfig.guild_id == guild_id))


# Update verified role
async def update_verified_role(guild_id: int, role_id: int | None) -> bool:

    async with AsyncSessionLocal() as session:

        result = await session.execute(
            update(VerificationConfig).where(
                VerificationConfig.guild_id == guild_id).values(
                    verified_role_id=role_id))
        await session.commit()

        return (getattr(result, "rowcount", 0) or 0) > 0


# Update unverified role
async def update_unverified_role(guild_id: int, role_id: int | None) -> bool:

    async with AsyncSessionLocal() as session:

        result = await session.execute(
            update(VerificationConfig).where(
                VerificationConfig.guild_id == guild_id).values(
                    unverified_role_id=role_id))
        await session.commit()
        return (getattr(result, "rowcount", 0) or 0) > 0
