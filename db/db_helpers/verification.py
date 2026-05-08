from sqlalchemy import delete
from sqlalchemy import select
from sqlalchemy import update
from sqlalchemy.dialects.sqlite import insert

from db.engine import AsyncSessionLocal
from db.models import VerificationConfig


# SET CONFIG
async def set_verification_config(
    *,
    guild_id: int,
    verify_channel_id: int | None = None,
    log_channel_id: int | None = None,
    verified_role_id: int | None = None,
    unverified_role_id: int | None = None,
    verification_message_id: int | None = None,
) -> None:

    async with AsyncSessionLocal() as session:

        stmt = insert(VerificationConfig).values(
            guild_id=guild_id,
            verify_channel_id=verify_channel_id,
            log_channel_id=log_channel_id,
            verified_role_id=verified_role_id,
            unverified_role_id=unverified_role_id,
            verification_message_id=verification_message_id,
        )

        stmt = stmt.on_conflict_do_update(
            index_elements=[
                VerificationConfig.guild_id,
            ],
            set_={
                "verify_channel_id": verify_channel_id,
                "log_channel_id": log_channel_id,
                "verified_role_id": verified_role_id,
                "unverified_role_id": unverified_role_id,
                "verification_message_id": verification_message_id,
            },
        )

        await session.execute(stmt)

        await session.commit()


# GET FULL CONFIG


async def get_verification_config(
    guild_id: int, ) -> VerificationConfig | None:

    async with AsyncSessionLocal() as session:

        return await session.scalar(
            select(VerificationConfig).where(
                VerificationConfig.guild_id == guild_id))


# CHECK CONFIGURED


async def is_verification_configured(guild_id: int, ) -> bool:

    async with AsyncSessionLocal() as session:

        return await session.scalar(
            select(VerificationConfig.guild_id).where(
                VerificationConfig.guild_id == guild_id)) is not None


# DELETE CONFIG


async def delete_verification_config(guild_id: int, ) -> bool:

    async with AsyncSessionLocal() as session:

        result = await session.execute(
            delete(VerificationConfig).where(
                VerificationConfig.guild_id == guild_id))

        await session.commit()

        return result.rowcount > 0 # type: ignore


# UPDATE VERIFICATION MESSAGE


async def update_verification_message(
    guild_id: int,
    message_id: int | None,
) -> bool:

    async with AsyncSessionLocal() as session:

        result = await session.execute(
            update(VerificationConfig).where(
                VerificationConfig.guild_id == guild_id).values(
                    verification_message_id=message_id))

        await session.commit()

        return result.rowcount > 0 # type: ignore


# FETCH VERIFICATION MESSAGE


async def get_verification_message(guild_id: int, ) -> int | None:

    async with AsyncSessionLocal() as session:

        return await session.scalar(
            select(VerificationConfig.verification_message_id).where(
                VerificationConfig.guild_id == guild_id))


# UPDATE VERIFIED ROLE


async def update_verified_role(
    guild_id: int,
    role_id: int | None,
) -> bool:

    async with AsyncSessionLocal() as session:

        result = await session.execute(
            update(VerificationConfig).where(
                VerificationConfig.guild_id == guild_id).values(
                    verified_role_id=role_id))

        await session.commit()

        return result.rowcount > 0 # type: ignore


# UPDATE UNVERIFIED ROLE


async def update_unverified_role(
    guild_id: int,
    role_id: int | None,
) -> bool:

    async with AsyncSessionLocal() as session:

        result = await session.execute(
            update(VerificationConfig).where(
                VerificationConfig.guild_id == guild_id).values(
                    unverified_role_id=role_id))

        await session.commit()

        return result.rowcount > 0 # type: ignore
