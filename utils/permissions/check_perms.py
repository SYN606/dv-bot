from __future__ import annotations

from typing import Iterable, Optional, Union
import discord
from discord.ext import commands
from db.db_helpers.admin_roles import get_admin_roles

# CACHE
_ADMIN_ROLE_CACHE: dict[int, set[int]] = {}


# CACHE HELPERS
async def get_cached_admin_roles(guild_id: int) -> set[int]:
    cached = _ADMIN_ROLE_CACHE.get(guild_id)
    if cached is not None:
        return cached

    try:
        role_ids = set(await get_admin_roles(guild_id))
        _ADMIN_ROLE_CACHE[guild_id] = role_ids
        return role_ids

    except Exception:
        return set()


async def clear_admin_role_cache(guild_id: int) -> None:
    _ADMIN_ROLE_CACHE.pop(guild_id, None)


def _resolve_member_and_guild(
    target: Union[discord.Interaction, commands.Context, discord.Member, discord.User, Any],
) -> tuple[Optional[discord.Member], Optional[discord.Guild]]:
    """Resolves Member and Guild across Interaction, Context, or Member instances."""
    if target is None:
        return None, None

    # commands.Context
    if hasattr(target, "author") and hasattr(target, "guild"):
        guild = getattr(target, "guild", None)
        author = getattr(target, "author", None)
        return author, guild

    # discord.Interaction
    if hasattr(target, "user") and hasattr(target, "guild") and hasattr(target, "response"):
        guild = getattr(target, "guild", None)
        user = getattr(target, "user", None)
        if isinstance(user, discord.Member):
            return user, guild
        if guild is not None and hasattr(guild, "get_member"):
            user_id = getattr(user, "id", None)
            if user_id:
                member = guild.get_member(user_id)
                if member is not None:
                    return member, guild
        return user, guild

    # discord.Member or duck-typed member with guild
    if hasattr(target, "guild"):
        return target, getattr(target, "guild", None)

    return None, None


# CORE BOT ADMIN CHECK
async def _member_is_bot_admin(member: discord.Member) -> bool:
    """Core check: returns True if member is Guild Owner, Administrator, or possesses an explicit Bot Admin Role."""
    if member is None:
        return False

    guild = getattr(member, "guild", None)
    if guild is None:
        return False

    # SERVER OWNER
    if getattr(guild, "owner_id", None) == getattr(member, "id", None):
        return True

    perms = getattr(member, "guild_permissions", None)
    # TRUE ADMINISTRATOR
    if perms is not None and getattr(perms, "administrator", False):
        return True

    # EXPLICIT BOT ADMIN ROLES
    try:
        guild_id = getattr(guild, "id", None)
        if guild_id is None:
            return False
        admin_role_ids = await get_cached_admin_roles(guild_id)
        if not admin_role_ids:
            return False
        member_roles = getattr(member, "roles", [])
        member_role_ids = {role.id for role in member_roles}
        return bool(admin_role_ids & member_role_ids)
    except Exception:
        return False


async def is_bot_admin_member(member: discord.Member) -> bool:
    """Public wrapper for checking bot admin status on a discord.Member."""
    return await _member_is_bot_admin(member)


# SLASH / UNIVERSAL BOT ADMIN CHECK
async def is_bot_admin(
    target: Union[discord.Interaction, commands.Context, discord.Member, discord.User, Any],
) -> bool:
    """Universal check: returns True if target has bot administrative authority."""
    member, _ = _resolve_member_and_guild(target)
    if member is None:
        return False
    return await _member_is_bot_admin(member)


# PREFIX / HYBRID CHECK
async def is_bot_admin_ctx(ctx: commands.Context) -> bool:
    """Prefix / Hybrid context check for bot admin status."""
    return await is_bot_admin(ctx)


# CONFIG ACCESS
async def has_config_access(
    target: Union[discord.Interaction, commands.Context, discord.Member, discord.User, Any],
) -> bool:
    """Universal check for server configuration access (Owner, Admin, Manage Server, or Bot Admin)."""
    member, guild = _resolve_member_and_guild(target)
    if member is None or guild is None:
        return False

    # OWNER
    if getattr(guild, "owner_id", None) == getattr(member, "id", None):
        return True
    perms = getattr(member, "guild_permissions", None)
    if perms is not None:
        # ADMIN
        if getattr(perms, "administrator", False):
            return True
        # MANAGE SERVER
        if getattr(perms, "manage_guild", False):
            return True
    # BOT ADMIN
    return await _member_is_bot_admin(member)


async def has_config_access_ctx(ctx: commands.Context) -> bool:
    """Prefix / Hybrid context check for configuration access."""
    return await has_config_access(ctx)


# ROLE MANAGEMENT ACCESS
async def has_role_management_access(
    target: Union[discord.Interaction, commands.Context, discord.Member, discord.User, Any],
) -> bool:
    """Universal check for role management access (Owner, Admin, Manage Roles, or Bot Admin)."""
    member, guild = _resolve_member_and_guild(target)
    if member is None or guild is None:
        return False

    # OWNER
    if getattr(guild, "owner_id", None) == getattr(member, "id", None):
        return True
    perms = getattr(member, "guild_permissions", None)
    if perms is not None:
        # ADMIN
        if getattr(perms, "administrator", False):
            return True
        # MANAGE ROLES
        if getattr(perms, "manage_roles", False):
            return True
    # BOT ADMIN
    return await _member_is_bot_admin(member)


# MODERATION ACCESS
async def has_moderation_access(
    target: Union[discord.Interaction, commands.Context, discord.Member, discord.User, Any],
    required_permission: Optional[Union[str, Iterable[str]]] = None,
) -> bool:
    """
    Universal check for moderation access.
    Returns True if target is Server Owner, Administrator, Bot Admin,
    or possesses any of the specified required_permission permissions.
    """
    member, guild = _resolve_member_and_guild(target)
    if member is None or guild is None:
        return False

    # OWNER
    if getattr(guild, "owner_id", None) == getattr(member, "id", None):
        return True

    perms = getattr(member, "guild_permissions", None)
    if perms is not None:
        # ADMIN
        if getattr(perms, "administrator", False):
            return True

    # BOT ADMIN ROLE
    if await is_bot_admin(member):
        return True

    # SPECIFIC MODERATION PERMISSIONS
    if required_permission:
        if perms is None:
            return False
        perm_list = [required_permission] if isinstance(required_permission, str) else list(required_permission)
        if any(getattr(perms, perm, False) for perm in perm_list):
            return True
        return False

    if perms is None:
        return False

    # Default general moderation authority check
    return bool(
        getattr(perms, "kick_members", False)
        or getattr(perms, "ban_members", False)
        or getattr(perms, "moderate_members", False)
        or getattr(perms, "manage_messages", False)
        or getattr(perms, "manage_roles", False)
        or getattr(perms, "manage_guild", False)
        or getattr(perms, "move_members", False)
        or getattr(perms, "manage_channels", False)
    )


__all__ = [
    "get_cached_admin_roles",
    "clear_admin_role_cache",
    "is_bot_admin_member",
    "is_bot_admin",
    "is_bot_admin_ctx",
    "has_config_access",
    "has_config_access_ctx",
    "has_role_management_access",
    "has_moderation_access",
]
