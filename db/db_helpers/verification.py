from sqlalchemy import select
from db.engine import AsyncSessionLocal
from db.models import VerificationConfig


# region: SET CONFIG
async def set_verification_config(
    *,
    guild_id: int,
    verify_channel_id: int,
    log_channel_id: int,
    verified_role_id: int,
    unverified_role_id: int | None,
) -> None:

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(VerificationConfig).where(
                VerificationConfig.guild_id == guild_id))

        row = result.scalar_one_or_none()

        if row:
            row.verify_channel_id = verify_channel_id
            row.log_channel_id = log_channel_id
            row.verified_role_id = verified_role_id
            row.unverified_role_id = unverified_role_id
        else:
            session.add(
                VerificationConfig(
                    guild_id=guild_id,
                    verify_channel_id=verify_channel_id,
                    log_channel_id=log_channel_id,
                    verified_role_id=verified_role_id,
                    unverified_role_id=unverified_role_id,
                ))

        await session.commit()


# region : GET CONFIG
async def get_verification_config(
    guild_id: int, ) -> VerificationConfig | None:

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(VerificationConfig).where(
                VerificationConfig.guild_id == guild_id))
        return result.scalar_one_or_none()


# region: CHECK IF CONFIGURED
async def is_verification_configured(guild_id: int, ) -> bool:

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(VerificationConfig.guild_id).where(
                VerificationConfig.guild_id == guild_id))
        return result.first() is not None


# region: DELETE CONFIG
async def delete_verification_config(guild_id: int, ) -> bool:

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(VerificationConfig).where(
                VerificationConfig.guild_id == guild_id))

        row = result.scalar_one_or_none()

        if not row:
            return False

        await session.delete(row)
        await session.commit()
        return True
