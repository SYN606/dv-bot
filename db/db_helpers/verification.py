from db.models import Guild, VerificationConfig


async def set_verification_config(
    *,
    guild_id: int,
    verify_channel_id: int | None = None,
    log_channel_id: int | None = None,
    verified_role_id: int | None = None,
    unverified_role_id: int | None = None,
) -> None:
    """Sets or updates the verification configuration for a guild."""
    # Ensure foreign key record exists in the 'guilds' table
    await Guild.get_or_create(guild_id=guild_id)

    fields = {
        "verify_channel_id": verify_channel_id,
        "log_channel_id": log_channel_id,
        "verified_role_id": verified_role_id,
        "unverified_role_id": unverified_role_id,
    }

    # Filter out None values to prevent overwriting existing settings with None on updates
    defaults = {k: v for k, v in fields.items() if v is not None}

    await VerificationConfig.update_or_create(
        guild_id=guild_id,
        defaults=defaults,
    )


async def get_verification_config(guild_id: int) -> VerificationConfig | None:
    """Fetches the verification configuration model for a guild."""
    return await VerificationConfig.get_or_none(guild_id=guild_id)


async def is_verification_configured(guild_id: int) -> bool:
    """Checks whether verification settings exist for a guild."""
    return await VerificationConfig.filter(guild_id=guild_id).exists()


async def delete_verification_config(guild_id: int) -> bool:
    """Deletes the verification configuration record for a guild."""
    deleted_count = await VerificationConfig.filter(guild_id=guild_id).delete()
    return deleted_count > 0


async def update_verified_role(guild_id: int, role_id: int | None) -> bool:
    """Updates the verified role ID for a guild."""
    updated_count = await VerificationConfig.filter(guild_id=guild_id).update(
        verified_role_id=role_id)
    return updated_count > 0


async def update_unverified_role(guild_id: int, role_id: int | None) -> bool:
    """Updates the unverified role ID for a guild."""
    updated_count = await VerificationConfig.filter(guild_id=guild_id).update(
        unverified_role_id=role_id)
    return updated_count > 0
