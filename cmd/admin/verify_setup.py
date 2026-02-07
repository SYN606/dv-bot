import discord
from discord import app_commands
from discord.ext import commands

from utils.check_perms import is_bot_admin
from utils.embeds import make_embed
from utils.views.verification_views.verify_setup_view import VerifySetupView


class VerifySetup(commands.Cog):
    """
    /verify_setup

    Opens the interactive verification setup panel.
    Single-message, self-updating v2 workflow.
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
                    ("You do not have permission to configure verification.\n"
                     "Administrator access is required."),
                    level="ERROR",
                ),
                ephemeral=True,
            )
            return

        # Build setup view
        view = VerifySetupView(guild=guild)

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

        # Send SINGLE ephemeral message
        await interaction.response.send_message(
            embed=embed,
            view=view,
            ephemeral=True,
        )

        # Attach message ownership to the view (CRITICAL)
        view.message = await interaction.original_response()


# EXTENSION ENTRY POINT (REQUIRED)
async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(VerifySetup(bot))
