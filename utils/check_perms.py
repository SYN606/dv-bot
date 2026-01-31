import discord
from db.db_helpers.admin_roles import get_admin_roles


def is_bot_admin(interaction: discord.Interaction) -> bool:
    """
    Slash-command-only bot admin permission check.
    """

    if not interaction.guild:
        return False

    member = interaction.user
    if not isinstance(member, discord.Member):
        return False

    if interaction.guild.owner_id == member.id:
        return True

    if member.guild_permissions.administrator:
        return True

    admin_roles = set(get_admin_roles(interaction.guild.id))
    member_roles = {role.id for role in member.roles}

    return bool(member_roles & admin_roles)
