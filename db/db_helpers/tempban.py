from datetime import datetime, timezone
from db.models import TempbanConfig, TempbanRecord


# Set tempban role
async def set_tempban_role(guild_id: int, role_id: int) -> None:
    """Sets or updates the designated tempban role for a guild."""
    await TempbanConfig.update_or_create(
        guild_id=guild_id,
        defaults={"role_id": role_id},
    )


# Get tempban role
async def get_tempban_role(guild_id: int) -> int | None:
    """Retrieves the configured tempban role ID for a guild if set."""
    config = await TempbanConfig.get_or_none(guild_id=guild_id)
    return config.role_id if config else None


# Add tempban
async def add_tempban(
    *,
    guild_id: int,
    user_id: int,
    moderator_id: int,
    reason: str | None = None,
    expires_at: datetime | None = None,
) -> None:
    """Creates or updates an active tempban record for a user."""
    now_utc = datetime.now(timezone.utc)

    # Ensure expires_at is timezone-aware in UTC if passed as a naive datetime
    if expires_at and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    await TempbanRecord.update_or_create(
        guild_id=guild_id,
        user_id=user_id,
        defaults={
            "moderator_id": moderator_id,
            "tempban_reason": reason,
            "expires_at": expires_at,
            "active": True,
            "updated_at": now_utc,
        },
    )


# Remove tempban
async def remove_tempban(*, guild_id: int, user_id: int,
                         moderator_id: int) -> bool:
    """Deactivates an active tempban record for a user."""
    now_utc = datetime.now(timezone.utc)

    updated_count = await TempbanRecord.filter(
        guild_id=guild_id,
        user_id=user_id,
        active=True,
    ).update(
        active=False,
        moderator_id=moderator_id,
        updated_at=now_utc,
    )

    return updated_count > 0


# Check tempban status
async def is_tempbanned(guild_id: int, user_id: int) -> bool:
    """Checks whether a user currently has an active tempban in a guild."""
    return await TempbanRecord.filter(guild_id=guild_id,
                                      user_id=user_id,
                                      active=True).exists()


# Fetch active tempbans
async def get_active_tempbans(guild_id: int) -> list[TempbanRecord]:
    """Retrieves all active tempban records for a specific guild."""
    return await TempbanRecord.filter(guild_id=guild_id, active=True).all()


# Fetch expired tempbans
async def get_expired_tempbans() -> list[TempbanRecord]:
    """Retrieves all active tempbans across all guilds that have reached their expiration time."""
    now_utc = datetime.now(timezone.utc)

    return await TempbanRecord.filter(active=True,
                                      expires_at__isnull=False,
                                      expires_at__lte=now_utc).all()
