import discord
from discord.ext import commands
from db.db_helpers.admin_roles import (get_admin_roles)

# CACHE
_ADMIN_ROLE_CACHE: dict[int, set[int]] = {}


# CACHE HELPERS
async def get_cached_admin_roles(guild_id: int, ) -> set[int]:
    cached = _ADMIN_ROLE_CACHE.get(guild_id, )
    if cached is not None:
        return cached

    try:
        role_ids = set(await get_admin_roles(guild_id, ))
        _ADMIN_ROLE_CACHE[guild_id] = role_ids
        return role_ids

    except Exception:
        return set()


async def clear_admin_role_cache(guild_id: int, ):
    _ADMIN_ROLE_CACHE.pop(guild_id, None)


# CORE BOT ADMIN CHECK
async def _member_is_bot_admin(member: discord.Member) -> bool:
    guild = member.guild
    # SERVER OWNER
    if guild.owner_id == member.id:
        return True

    perms = (member.guild_permissions)
    # TRUE ADMINISTRATOR
    if perms.administrator:
        return True
    # EXPLICIT BOT ADMIN ROLES
    try:
        admin_role_ids = (await get_cached_admin_roles(guild.id))
        if not admin_role_ids:
            return False
        member_role_ids = {role.id for role in member.roles}
        return bool(admin_role_ids & member_role_ids)
    except Exception:
        return False


# SLASH COMMAND CHECK
async def is_bot_admin(interaction: discord.Interaction) -> bool:
    guild = interaction.guild
    if guild is None:
        return False
    user = interaction.user
    member = guild.get_member(user.id)
    if (member is None and isinstance(user, discord.Member)):
        member = user
    if member is None:
        return False
    return await _member_is_bot_admin(member)


# PREFIX / HYBRID CHECK
async def is_bot_admin_ctx(ctx: commands.Context) -> bool:
    guild = ctx.guild
    if guild is None:
        return False
    author = ctx.author
    if not isinstance(author, discord.Member):
        return False
    return await _member_is_bot_admin(author)


# CONFIG ACCESS
async def has_config_access_ctx(ctx: commands.Context) -> bool:
    guild = ctx.guild

    if guild is None:
        return False
    author = ctx.author
    if not isinstance(author, discord.Member):
        return False
    # OWNER
    if author.id == guild.owner_id:
        return True
    perms = (author.guild_permissions)
    # ADMIN
    if perms.administrator:
        return True
    # MANAGE SERVER
    if perms.manage_guild:
        return True
    # BOT ADMIN
    return await is_bot_admin_ctx(ctx, )


# CONFIG ACCESS INTERACTION
async def has_config_access(interaction: discord.Interaction, ) -> bool:
    guild = interaction.guild

    if guild is None:
        return False
    user = interaction.user
    if not isinstance(user, discord.Member):
        return False

    # OWNER
    if user.id == guild.owner_id:
        return True
    perms = (user.guild_permissions)

    # ADMIN
    if perms.administrator:
        return True

    # MANAGE SERVER
    if perms.manage_guild:
        return True

    # BOT ADMIN
    return await is_bot_admin(interaction, )


# ROLE MANAGEMENT ACCESS
async def has_role_management_access(
    interaction: discord.Interaction, ) -> bool:
    guild = interaction.guild
    if guild is None:
        return False
    user = interaction.user
    if not isinstance(
            user,
            discord.Member,
    ):
        return False
    # OWNER
    if user.id == guild.owner_id:
        return True
    perms = (user.guild_permissions)
    # ADMIN
    if perms.administrator:
        return True
    # MANAGE ROLES
    if perms.manage_roles:
        return True
    # BOT ADMIN
    return await is_bot_admin(interaction, )
