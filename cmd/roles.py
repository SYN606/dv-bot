import discord
from discord.ext import commands
from discord import app_commands

from utils.embeds import make_embed


class Roles(commands.Cog):

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    # ─────────────────────────────────────
    # ADD ROLE
    # ─────────────────────────────────────
    @app_commands.command(name="addrole",
                          description="Add a role to a user (admin only)")
    @app_commands.describe(member="Member to assign the role to",
                           role="Role to add")
    async def addrole(self, interaction: discord.Interaction,
                      member: discord.Member, role: discord.Role):
        # Permission check
        if not interaction.permissions.manage_roles:
            embed = make_embed(
                title="Permission Denied",
                description="You do not have permission to manage roles.",
                level="ERROR")
            return await interaction.response.send_message(embed=embed,
                                                           ephemeral=True)

        # Role hierarchy check
        if role >= interaction.user.top_role: # type: ignore
            embed = make_embed(
                title="Role Hierarchy Error",
                description=
                "You cannot assign a role equal to or higher than your highest role.",
                level="WARNING")
            return await interaction.response.send_message(embed=embed,
                                                           ephemeral=True)

        if role >= interaction.guild.me.top_role: # type: ignore
            embed = make_embed(
                title="Role Hierarchy Error",
                description=
                "I cannot assign a role higher than my highest role.",
                level="ERROR")
            return await interaction.response.send_message(embed=embed,
                                                           ephemeral=True)

        # Add role
        await member.add_roles(role, reason=f"Added by {interaction.user}")

        embed = make_embed(
            title="Role Added",
            description=f"Role **{role.name}** has been added to **{member}**.",
            level="SUCCESS",
            footer=f"Action by {interaction.user}")

        await interaction.response.send_message(embed=embed)

    # ─────────────────────────────────────
    # REMOVE ROLE
    # ─────────────────────────────────────
    @app_commands.command(name="removerole",
                          description="Remove a role from a user (admin only)")
    @app_commands.describe(member="Member to remove the role from",
                           role="Role to remove")
    async def removerole(self, interaction: discord.Interaction,
                         member: discord.Member, role: discord.Role):
        # Permission check
        if not interaction.permissions.manage_roles:
            embed = make_embed(
                title="Permission Denied",
                description="You do not have permission to manage roles.",
                level="ERROR")
            return await interaction.response.send_message(embed=embed,
                                                           ephemeral=True)

        # Role hierarchy check
        if role >= interaction.user.top_role: # type: ignore
            embed = make_embed(
                title="Role Hierarchy Error",
                description=
                "You cannot remove a role equal to or higher than your highest role.",
                level="WARNING")
            return await interaction.response.send_message(embed=embed,
                                                           ephemeral=True)

        if role >= interaction.guild.me.top_role: # type: ignore
            embed = make_embed(
                title="Role Hierarchy Error",
                description=
                "I cannot remove a role higher than my highest role.",
                level="ERROR")
            return await interaction.response.send_message(embed=embed,
                                                           ephemeral=True)

        # Remove role
        await member.remove_roles(role,
                                  reason=f"Removed by {interaction.user}")

        embed = make_embed(
            title="Role Removed",
            description=
            f"Role **{role.name}** has been removed from **{member}**.",
            level="SUCCESS",
            footer=f"Action by {interaction.user}")

        await interaction.response.send_message(embed=embed)


async def setup(bot: commands.Bot):
    await bot.add_cog(Roles(bot))
