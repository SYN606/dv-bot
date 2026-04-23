import discord
from discord.ext import commands

from db.db_helpers.admin_roles import get_admin_roles


# =====================================================
# CORE CHECK
# =====================================================
async def _member_is_bot_admin(member: discord.Member) -> bool:
    """
    Core permission resolver.

    Priority:
    1. Guild owner
    2. Discord administrator permission
    3. Moderation permissions (kick / ban / timeout)
    4. Custom bot-admin roles
    """

    # 1. Guild owner
    if member.guild.owner_id == member.id:
        return True

    perms = member.guild_permissions

    # 2. Discord administrator
    if perms.administrator:
        return True

    # 3. Moderation permissions
    if (perms.kick_members or perms.ban_members
            or perms.moderate_members  # timeout permission
        ):
        return True

    # 4. Custom bot-admin roles
    try:
        admin_role_ids = set(await get_admin_roles(member.guild.id))
        member_role_ids = {role.id for role in member.roles}

        if admin_role_ids & member_role_ids:
            return True

    except Exception:
        # Fail-safe: don't break command flow if DB fails
        pass

    return False


# =====================================================
# SLASH COMMAND CHECK
# =====================================================
async def is_bot_admin(interaction: discord.Interaction) -> bool:
    """
    Slash-command bot admin permission check.
    """

    if interaction.guild is None:
        return False

    member = interaction.guild.get_member(interaction.user.id)

    # Fallback: interaction.user might already be Member
    if member is None and isinstance(interaction.user, discord.Member):
        member = interaction.user

    if member is None:
        return False

    return await _member_is_bot_admin(member)


# =====================================================
# PREFIX / HYBRID COMMAND CHECK
# =====================================================
async def is_bot_admin_ctx(ctx: commands.Context) -> bool:
    """
    Prefix / hybrid command bot admin permission check.
    """

    if ctx.guild is None:
        return False

    if not isinstance(ctx.author, discord.Member):
        return False

    return await _member_is_bot_admin(ctx.author)
