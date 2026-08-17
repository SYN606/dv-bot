from typing import cast
from db.models import AdminRole


async def add_admin_role(guild_id: int, role_id: int) -> bool:
    """
    Adds an admin role to a guild.
    Returns True if created, False if it already existed.
    """
    _, created = await AdminRole.get_or_create(
        guild_id=guild_id,
        role_id=role_id,
    )
    return created


async def remove_admin_role(guild_id: int, role_id: int) -> bool:
    """
    Removes an admin role from a guild.
    Returns True if a record was deleted, False otherwise.
    """
    deleted_count = await AdminRole.filter(
        guild_id=guild_id,
        role_id=role_id,
    ).delete()

    return deleted_count > 0


async def get_admin_roles(guild_id: int) -> list[int]:
    """
    Retrieves all admin role IDs registered for a given guild.
    """
    roles = await AdminRole.filter(guild_id=guild_id).values_list("role_id",
                                                                  flat=True)

    return cast(list[int], roles)


async def is_admin_role(guild_id: int, role_id: int) -> bool:
    """
    Checks whether a specific role is an admin role in the given guild.
    """
    return await AdminRole.filter(guild_id=guild_id, role_id=role_id).exists()
