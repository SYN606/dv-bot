import discord
from discord.ext import commands
from db.db_helpers.admin_roles import get_admin_roles


def _member_is_bot_admin(member: discord.Member) -> bool:
    if member.guild.owner_id == member.id:
        return True

    if member.guild_permissions.administrator:
        return True

    admin_roles = set(get_admin_roles(member.guild.id))
    member_roles = {role.id for role in member.roles}

    return bool(member_roles & admin_roles)


# ─────────────────────────────────
# SLASH COMMANDS
# ─────────────────────────────────
def is_bot_admin(interaction: discord.Interaction) -> bool:
    """
    Slash-command-only bot admin permission check.
    """
    if not interaction.guild:
        return False

    if not isinstance(interaction.user, discord.Member):
        return False

    return _member_is_bot_admin(interaction.user)


# ─────────────────────────────────
# PREFIX / HYBRID COMMANDS
# ─────────────────────────────────
def is_bot_admin_ctx(ctx: commands.Context) -> bool:
    """
    Prefix / hybrid command bot admin permission check.
    """
    if not ctx.guild:
        return False

    if not isinstance(ctx.author, discord.Member):
        return False

    return _member_is_bot_admin(ctx.author)
