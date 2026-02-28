import discord
from discord import app_commands
from discord.ext import commands

from utils.base_admin import BaseAdminCog
from utils.embeds import make_embed
from utils.logging.mod_log import send_mod_log
from utils.views.verification_views.verify_setup_view import VerifySetupView


class VerifySetup(BaseAdminCog):
    """
    /verify_setup

    Opens the interactive verification setup panel.
    Admin-only.
    """

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @app_commands.command(
        name="verify_setup",
        description="Configure the verification system",
    )
    async def verify_setup(
        self,
        interaction: discord.Interaction,
    ) -> None:

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

        # Permission handled automatically by BaseAdminCog

        view = VerifySetupView(
            guild=guild,
            actor_id=interaction.user.id,
        )

        embed = make_embed(
            title="Verification Setup",
            description=
            ("Configure the verification system using the controls below.\n\n"
             "**You can configure:**\n"
             "• Verification channel\n"
             "• Log channel\n"
             "• Verified role\n"
             "• Optional unverified role\n\n"
             "Changes are applied only after selecting "
             "**Save & Post Verification Message**."),
            level="SYSTEM",
            footer=f"Action by {interaction.user}",
        )

        await interaction.response.send_message(
            embed=embed,
            view=view,
            ephemeral=True,
        )

        view.message = await interaction.original_response()

        # Structured logging (view opened)
        await send_mod_log(
            guild=guild,
            category="VERIFY",
            title="Verification Setup Panel Opened",
            description="Verification configuration panel opened.",
            level="INFO",
            actor=interaction.user,
        )


async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(VerifySetup(bot))
