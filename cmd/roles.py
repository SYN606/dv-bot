import discord
from discord.ext import commands
from discord import app_commands

from utils.check_perms import is_bot_admin
from utils.embeds import make_embed
from utils.views.role_manager import RoleManagerView


class Roles(commands.Cog):
    """
    Role management commands.
    """

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @app_commands.command(
        name="roles",
        description="Manage roles for a member using an interactive interface",
    )
    @app_commands.describe(member="Member whose roles you want to manage")
    async def roles(
        self,
        interaction: discord.Interaction,
        member: discord.Member,
    ) -> None:

        guild = interaction.guild
        actor = interaction.user

        if guild is None or not isinstance(actor, discord.Member):
            return await interaction.response.send_message(
                embed=make_embed(
                    title="Invalid Context",
                    description=
                    "This command can only be used inside a server.",
                    level="ERROR",
                ),
                ephemeral=True,
            )

        # Permission check BEFORE defer (faster fail)
        if not await is_bot_admin(interaction):
            return await interaction.response.send_message(
                embed=make_embed(
                    title="Permission Denied",
                    description=(
                        "You do not have permission to manage roles.\n"
                        "Administrator access is required."),
                    level="ERROR",
                ),
                ephemeral=True,
            )

        # Safety checks
        if member.bot and member.id == self.bot.user.id:
            return await interaction.response.send_message(
                embed=make_embed(
                    title="Invalid Target",
                    description="You cannot manage my roles.",
                    level="ERROR",
                ),
                ephemeral=True,
            )

        if member == actor:
            return await interaction.response.send_message(
                embed=make_embed(
                    title="Invalid Target",
                    description="You cannot manage your own roles.",
                    level="ERROR",
                ),
                ephemeral=True,
            )

        if member.top_role >= actor.top_role:
            return await interaction.response.send_message(
                embed=make_embed(
                    title="Role Hierarchy Error",
                    description=(
                        "You cannot manage this user because their top role "
                        "is higher than or equal to yours."),
                    level="ERROR",
                ),
                ephemeral=True,
            )

        # Defer after passing validation
        await interaction.response.defer(ephemeral=True)

        view = RoleManagerView(
            bot=self.bot,
            actor=actor,
            target=member,
            guild=guild,
        )

        embed = make_embed(
            title="Role Manager",
            description=(f"Managing roles for {member.mention}.\n\n"
                         "Use the menus below to queue role changes.\n"
                         "Click **Apply Changes** to confirm."),
            level="SYSTEM",
            footer=f"Action by {actor}",
        )

        await interaction.followup.send(
            embed=embed,
            view=view,
            ephemeral=True,
        )

        view.message = await interaction.original_response()


async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(Roles(bot))
