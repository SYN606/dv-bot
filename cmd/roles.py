import discord
from discord.ext import commands
from discord import app_commands

from utils.check_perms import is_bot_admin
from utils.embeds import make_embed
from utils.views.role_manager import RoleManagerView


class Roles(commands.Cog):
    """
    Role management commands.

    Provides an interactive UI for administrators
    to add or remove roles from a member.
    """

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @app_commands.command(
        name="roles",
        description="Manage roles for a member using an interactive interface",
    )
    @app_commands.describe(member="Member whose roles you want to manage", )
    async def roles(
        self,
        interaction: discord.Interaction,
        member: discord.Member,
    ) -> None:
        """
        Launch the interactive role manager for a member.
        """

        # ─────────────────────────────
        # Context validation
        # ─────────────────────────────
        guild = interaction.guild
        actor = interaction.user

        if guild is None:
            return

        if not isinstance(actor, discord.Member):
            return

        # ─────────────────────────────
        # Permission check
        # ─────────────────────────────
        if not is_bot_admin(interaction):
            await interaction.response.send_message(
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

        # ─────────────────────────────
        # Build interactive role manager view
        # ─────────────────────────────
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

        # IMPORTANT:
        # Capture the original message and attach it to the view
        message = await interaction.response.send_message(
            embed=embed,
            view=view,
            ephemeral=True,
        )

        # discord.py quirk:
        # interaction.response.send_message() returns None
        # so we must fetch the original response
        view.message = await interaction.original_response()


async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(Roles(bot))
