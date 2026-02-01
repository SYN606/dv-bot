import discord
from discord.ext import commands
from db.db_helpers.admin_roles import get_admin_roles


# ─────────────────────────────────
# CORE CHECK
# ─────────────────────────────────
def _member_is_bot_admin(member: discord.Member) -> bool:
    # Server owner
    if member.guild.owner_id == member.id:
        return True

    # Discord administrator
    if member.guild_permissions.administrator:
        return True

    # Bot-admin roles
    admin_roles = set(get_admin_roles(member.guild.id))
    member_roles = {role.id for role in member.roles}

    return bool(member_roles & admin_roles)


# ─────────────────────────────────
# SLASH COMMANDS
# ─────────────────────────────────
def is_bot_admin(interaction: discord.Interaction) -> bool:
    """
    Slash-command bot admin permission check.
    """
    if interaction.guild is None:
        return False

    # 🔥 ALWAYS resolve Member from guild
    member = interaction.guild.get_member(interaction.user.id)
    if member is None:
        return False

    return _member_is_bot_admin(member)


# ─────────────────────────────────
# PREFIX / HYBRID COMMANDS
# ─────────────────────────────────
def is_bot_admin_ctx(ctx: commands.Context) -> bool:
    """
    Prefix / hybrid command bot admin permission check.
    """
    if ctx.guild is None:
        return False

    if not isinstance(ctx.author, discord.Member):
        return False

    return _member_is_bot_admin(ctx.author)
