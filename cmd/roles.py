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

        await interaction.response.defer(ephemeral=True)

        guild = interaction.guild
        actor = interaction.user

        if guild is None or not isinstance(actor, discord.Member):
            return

        if not await is_bot_admin(interaction):
            await interaction.followup.send(
                embed=make_embed(
                    title="Permission Denied",
                    description=(
                        "You do not have permission to manage roles.\n"
                        "Administrator access is required."),
                    level="ERROR",
                ),
                ephemeral=True,
            )
            return

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
