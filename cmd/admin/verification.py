import logging

import discord
from discord import app_commands
from discord.ext import commands

from utils.core.embeds import make_embed
from utils.permissions.base_admin import BaseAdminCog
from utils.views.verification_views.verify_panel_view import VerificationView

logger = logging.getLogger("bot")


class Verification(BaseAdminCog):
    """Cog responsible for displaying and handling the verification management control panel."""

    def __init__(self, bot: commands.Bot) -> None:
        self.bot = bot

    @app_commands.command(name="verification",
                          description="Manage server verification system")
    async def verification(self, interaction: discord.Interaction) -> None:
        guild = interaction.guild
        actor = interaction.user

        if guild is None or not isinstance(actor, discord.Member):
            await interaction.response.send_message(embed=make_embed(
                title="Invalid Context",
                description="This command must be used inside a server.",
                level="ERROR"),
                                                    ephemeral=True)
            return

        view = VerificationView(bot=self.bot, guild=guild, actor=actor)

        embed = make_embed(
            title="🔐 Verification Control Panel",
            description=("Manage the server verification system.\n\n"
                         "🔧 **Setup** → Configure verification system\n"
                         "⚠️ **Reset** → Disable verification system\n\n"
                         "Use the buttons below to proceed."),
            level="SYSTEM",
            footer=f"Action by {actor}")

        await interaction.response.send_message(embed=embed,
                                                view=view,
                                                ephemeral=True)

        # Attach original response message reference to view
        try:
            view.message = await interaction.original_response()
        except Exception:
            logger.exception(
                "Failed to retrieve original response message for VerificationView"
            )


async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(Verification(bot))
