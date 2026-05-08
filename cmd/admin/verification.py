import discord
from discord import app_commands
from discord.ext import commands
from utils.permissions.base_admin import BaseAdminCog
from utils.core.embeds import make_embed
from utils.views.verification_views.verify_panel_view import VerificationView


class Verification(BaseAdminCog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @app_commands.command(
        name="verification",
        description="Manage verification system",
    )
    async def verification(self, interaction: discord.Interaction):

        guild = interaction.guild
        if guild is None:
            return await interaction.response.send_message(
                embed=make_embed(
                    title="Invalid Context",
                    description="This command must be used inside a server.",
                    level="ERROR",
                ),
                ephemeral=True,
            )

        # USE NEW VIEW
        view = VerificationView(
            bot=self.bot,
            guild=guild,
            actor=interaction.user, # type: ignore
        )

        embed = make_embed(
            title="🔐 Verification Control Panel",
            description=(
                "Manage the server verification system.\n\n"
                "🔧 **Setup** → Configure verification system\n"
                "⚠️ **Reset** → Disable verification system\n\n"
                "Use the buttons below to proceed."
            ),
            level="SYSTEM",
            footer=f"Action by {interaction.user}",
        )

        await interaction.response.send_message(
            embed=embed,
            view=view,
            ephemeral=True,
        )

        # attach message to view 
        try:
            view.message = await interaction.original_response()
        except Exception:
            pass


async def setup(bot: commands.Bot):
    await bot.add_cog(Verification(bot))