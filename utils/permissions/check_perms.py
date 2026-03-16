import discord
from discord.ext import commands

from db.db_helpers.admin_roles import get_admin_roles


# region CORE CHECK
async def _member_is_bot_admin(member: discord.Member) -> bool:
    """
    Core permission resolver.

    Priority:
    1. Guild owner
    2. Discord administrator permission
    3. Custom bot-admin role
    """

    # Guild owner
    if member.guild.owner_id == member.id:
        return True

    # Discord administrator permission
    if member.guild_permissions.administrator:
        return True

    # Custom bot-admin roles
    admin_role_ids = set(await get_admin_roles(member.guild.id))
    member_role_ids = {role.id for role in member.roles}

    return bool(admin_role_ids & member_role_ids)


# endregion

# region SLASH COMMANDS


async def is_bot_admin(interaction: discord.Interaction) -> bool:
    """
    Slash-command bot admin permission check.
    """

    if interaction.guild is None:
        return False

    member = interaction.guild.get_member(interaction.user.id)
    if member is None:
        return False

    return await _member_is_bot_admin(member)


# endregion

# region PREFIX / HYBRID COMMANDS


async def is_bot_admin_ctx(ctx: commands.Context) -> bool:
    """
    Prefix / hybrid command bot admin permission check.
    """

    if ctx.guild is None:
        return False

    if not isinstance(ctx.author, discord.Member):
        return False

    return await _member_is_bot_admin(ctx.author)


# endregion
