from db.models import WarningRecord


# Create/Issue a warning
async def add_warning(guild_id: int, user_id: int, moderator_id: int,
                      reason: str) -> tuple[bool, int]:
    """Issues a warning to a user and returns a tuple of (success_status, total_user_warnings)."""
    await WarningRecord.create(
        guild_id=guild_id,
        user_id=user_id,
        moderator_id=moderator_id,
        reason=reason,
    )

    total_warns = await WarningRecord.filter(guild_id=guild_id,
                                             user_id=user_id).count()

    return True, total_warns


# Fetch warning logs history for a member
async def get_warnings(guild_id: int, user_id: int) -> list[WarningRecord]:
    """Retrieves all warning records for a user sorted by creation date descending."""
    return await WarningRecord.filter(
        guild_id=guild_id, user_id=user_id).order_by("-created_at").all()


# Delete a single warning index item
async def delete_warning_by_id(guild_id: int,
                               warn_id: int) -> tuple[bool, int, str]:
    """
    Deletes a single warning by ID.
    Returns tuple of (success_status, user_id, deleted_warning_reason).
    """
    record = await WarningRecord.get_or_none(warn_id=warn_id,
                                             guild_id=guild_id)
    if not record:
        return False, 0, ""

    user_id = record.user_id
    reason = record.reason

    await record.delete()
    return True, user_id, reason


# Wipe full history log configuration data
async def clear_all_warnings(guild_id: int, user_id: int) -> bool:
    """Deletes all warning records for a specific user in a guild."""
    deleted_count = await WarningRecord.filter(guild_id=guild_id,
                                               user_id=user_id).delete()

    return deleted_count > 0
