import discord
from discord.ext import commands
from discord import app_commands

from utils.embeds import make_embed
from utils.check_perms import is_bot_admin


class Roles(commands.Cog):

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @app_commands.command(name="addrole",
                          description="Add a role to a user (bot admin only)")
    async def addrole(self, interaction: discord.Interaction,
                      member: discord.Member, role: discord.Role):
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
                description="You do not have permission to manage roles.",
                level="ERROR"),
                                                           ephemeral=True)

        bot_member = guild.me
        actor = interaction.user

        if not isinstance(actor, discord.Member) or bot_member is None:
            return

        if role >= actor.top_role:
            return await interaction.response.send_message(embed=make_embed(
                title="Role Hierarchy Error",
                description=
                ("You cannot assign a role equal to or higher than your highest role."
                 ),
                level="WARNING"),
                                                           ephemeral=True)

        if role >= bot_member.top_role:
            return await interaction.response.send_message(embed=make_embed(
                title="Role Hierarchy Error",
                description=
                ("I cannot assign a role equal to or higher than my highest role."
                 ),
                level="ERROR"),
                                                           ephemeral=True)

        await member.add_roles(role, reason=f"Added by {interaction.user}")

        embed = make_embed(
            title="Role Added",
            description=f"{role.mention} has been added to {member.mention}.",
            level="SUCCESS",
            footer=f"Action by {interaction.user}")

        await interaction.response.send_message(embed=embed)

    @app_commands.command(
        name="removerole",
        description="Remove a role from a user (bot admin only)")
    async def removerole(self, interaction: discord.Interaction,
                         member: discord.Member, role: discord.Role):
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
                description="You do not have permission to manage roles.",
                level="ERROR"),
                                                           ephemeral=True)

        bot_member = guild.me
        actor = interaction.user

        if not isinstance(actor, discord.Member) or bot_member is None:
            return

        if role >= actor.top_role:
            return await interaction.response.send_message(embed=make_embed(
                title="Role Hierarchy Error",
                description=
                ("You cannot remove a role equal to or higher than your highest role."
                 ),
                level="WARNING"),
                                                           ephemeral=True)

        if role >= bot_member.top_role:
            return await interaction.response.send_message(embed=make_embed(
                title="Role Hierarchy Error",
                description=
                ("I cannot remove a role equal to or higher than my highest role."
                 ),
                level="ERROR"),
                                                           ephemeral=True)

        await member.remove_roles(role,
                                  reason=f"Removed by {interaction.user}")

        embed = make_embed(
            title="Role Removed",
            description=
            f"{role.mention} has been removed from {member.mention}.",
            level="SUCCESS",
            footer=f"Action by {interaction.user}")

        await interaction.response.send_message(embed=embed)


async def setup(bot: commands.Bot):
    await bot.add_cog(Roles(bot))
