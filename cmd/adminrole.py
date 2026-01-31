import discord
from discord.ext import commands
from discord import app_commands

from utils.embeds import make_embed
from utils.check_perms import is_bot_admin
from db.db_helpers.admin_roles import (add_admin_role, remove_admin_role, get_admin_roles)


class AdminRole(commands.Cog):

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @app_commands.command(name="adminrole_add",
                          description="Add a role as bot admin")
    async def adminrole_add(self, interaction: discord.Interaction,
                            role: discord.Role):
        guild = interaction.guild
        if guild is None:
            return await interaction.response.send_message(embed=make_embed(
                title="Invalid Context",
                description="This command can only be used in a server.",
                level="ERROR"),
                                                           ephemeral=True)

        if not is_bot_admin(interaction):
            return await interaction.response.send_message(embed=make_embed(
                title="Permission Denied",
                description=
                "You do not have permission to manage bot admin roles.",
                level="ERROR"),
                                                           ephemeral=True)

        added = add_admin_role(guild.id, role.id)

        embed = make_embed(
            title="Admin Role Added",
            description=(f"{role.mention} is now a bot admin role." if added
                         else f"{role.mention} is already a bot admin role."),
            level="SUCCESS" if added else "WARNING")

        await interaction.response.send_message(embed=embed)

    @app_commands.command(name="adminrole_remove",
                          description="Remove a role from bot admin")
    async def adminrole_remove(self, interaction: discord.Interaction,
                               role: discord.Role):
        guild = interaction.guild
        if guild is None:
            return await interaction.response.send_message(embed=make_embed(
                title="Invalid Context",
                description="This command can only be used in a server.",
                level="ERROR"),
                                                           ephemeral=True)

        if not is_bot_admin(interaction):
            return await interaction.response.send_message(embed=make_embed(
                title="Permission Denied",
                description=
                "You do not have permission to manage bot admin roles.",
                level="ERROR"),
                                                           ephemeral=True)

        removed = remove_admin_role(guild.id, role.id)

        embed = make_embed(
            title="Admin Role Removed",
            description=(f"{role.mention} is no longer a bot admin role."
                         if removed else
                         f"{role.mention} was not a bot admin role."),
            level="SUCCESS" if removed else "WARNING")

        await interaction.response.send_message(embed=embed)

    @app_commands.command(name="adminrole_list",
                          description="List all bot admin roles")
    async def adminrole_list(self, interaction: discord.Interaction):
        guild = interaction.guild
        if guild is None:
            return await interaction.response.send_message(embed=make_embed(
                title="Invalid Context",
                description="This command can only be used in a server.",
                level="ERROR"),
                                                           ephemeral=True)

        if not is_bot_admin(interaction):
            return await interaction.response.send_message(embed=make_embed(
                title="Permission Denied",
                description=
                "You do not have permission to view bot admin roles.",
                level="ERROR"),
                                                           ephemeral=True)

        role_ids = get_admin_roles(guild.id)

        roles = []
        for role_id in role_ids:
            role = guild.get_role(role_id)
            if role:
                roles.append(role.mention)

        embed = make_embed(title="Bot Admin Roles",
                           description="\n".join(roles)
                           if roles else "No bot admin roles configured.",
                           level="INFO")

        await interaction.response.send_message(embed=embed)


async def setup(bot: commands.Bot):
    await bot.add_cog(AdminRole(bot))
