import discord
from discord.ext import commands
from discord import app_commands

from utils.embeds import make_embed
from utils.emojis import EMOJIS
from utils.check_perms import is_bot_admin
from db.db_helpers.admin_roles import (
    add_admin_role,
    remove_admin_role,
    get_admin_roles,
)


class AdminRole(commands.Cog):

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    # ─────────────────────────────────────
    # ADD ADMIN ROLE
    # ─────────────────────────────────────
    @app_commands.command(
        name="adminrole_add",
        description="Add a role as a bot admin role",
    )
    async def adminrole_add(
        self,
        interaction: discord.Interaction,
        role: discord.Role,
    ):
        if interaction.guild is None:
            await interaction.response.send_message(
                embed=make_embed(
                    title="Invalid Context",
                    description=
                    "This command can only be used inside a server.",
                    level="ERROR",
                ),
                ephemeral=True,
            )
            return

        if not is_bot_admin(interaction):
            await interaction.response.send_message(
                embed=make_embed(
                    title="Permission Denied",
                    description=
                    "You are not allowed to manage bot admin roles.",
                    level="ERROR",
                ),
                ephemeral=True,
            )
            return

        added = add_admin_role(interaction.guild.id, role.id)

        embed = make_embed(
            title="Admin Role Updated",
            description=
            (f"{EMOJIS['success']} {role.mention} has been **added** as a bot admin role."
             if added else
             f"{EMOJIS['red_dot']} {role.mention} is already a bot admin role."
             ),
            level="SUCCESS" if added else "WARNING",
        )

        await interaction.response.send_message(embed=embed, ephemeral=True)

    # ─────────────────────────────────────
    # REMOVE ADMIN ROLE
    # ─────────────────────────────────────
    @app_commands.command(
        name="adminrole_remove",
        description="Remove a role from bot admin roles",
    )
    async def adminrole_remove(
        self,
        interaction: discord.Interaction,
        role: discord.Role,
    ):
        if interaction.guild is None:
            await interaction.response.send_message(
                embed=make_embed(
                    title="Invalid Context",
                    description=
                    "This command can only be used inside a server.",
                    level="ERROR",
                ),
                ephemeral=True,
            )
            return

        if not is_bot_admin(interaction):
            await interaction.response.send_message(
                embed=make_embed(
                    title="Permission Denied",
                    description=
                    "You are not allowed to manage bot admin roles.",
                    level="ERROR",
                ),
                ephemeral=True,
            )
            return

        removed = remove_admin_role(interaction.guild.id, role.id)

        embed = make_embed(
            title="Admin Role Updated",
            description=
            (f"{EMOJIS['success']} {role.mention} has been **removed** from bot admin roles."
             if removed else
             f"{EMOJIS['red_dot']} {role.mention} was not a bot admin role."),
            level="SUCCESS" if removed else "WARNING",
        )

        await interaction.response.send_message(embed=embed, ephemeral=True)

    # ─────────────────────────────────────
    # LIST ADMIN ROLES
    # ─────────────────────────────────────
    @app_commands.command(
        name="adminrole_list",
        description="List all configured bot admin roles",
    )
    async def adminrole_list(
        self,
        interaction: discord.Interaction,
    ):
        if interaction.guild is None:
            await interaction.response.send_message(
                embed=make_embed(
                    title="Invalid Context",
                    description=
                    "This command can only be used inside a server.",
                    level="ERROR",
                ),
                ephemeral=True,
            )
            return

        if not is_bot_admin(interaction):
            await interaction.response.send_message(
                embed=make_embed(
                    title="Permission Denied",
                    description="You are not allowed to view bot admin roles.",
                    level="ERROR",
                ),
                ephemeral=True,
            )
            return

        role_ids = get_admin_roles(interaction.guild.id)

        roles: list[str] = []
        for role_id in role_ids:
            role = interaction.guild.get_role(role_id)
            if role:
                roles.append(role.mention)

        embed = make_embed(
            title="Bot Admin Roles",
            description=(
                "\n".join(roles) if roles else
                f"{EMOJIS['red_dot']} No bot admin roles are configured."),
            level="INFO",
            footer="Server owners and bot admins can manage these roles",
        )

        await interaction.response.send_message(embed=embed, ephemeral=True)


async def setup(bot: commands.Bot):
    await bot.add_cog(AdminRole(bot))
