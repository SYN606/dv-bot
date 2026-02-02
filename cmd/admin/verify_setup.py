import discord
from discord import app_commands
from discord.ext import commands

from utils.check_perms import is_bot_admin
from utils.embeds import make_embed
from utils.emojis import EMOJIS
from utils.views.verify_setup_view import VerifySetupView


class VerifySetup(commands.Cog):
    """
    /verify_setup

    Opens the interactive verification setup panel
    (Wick-style selectors).
    """

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @app_commands.command(
        name="verify_setup",
        description="Open the verification setup panel",
    )
    async def verify_setup(self, interaction: discord.Interaction):
        guild = interaction.guild
        if guild is None:
            return await interaction.response.send_message(
                embed=make_embed(
                    title="Invalid Context",
                    description="This command can only be used in a server.",
                    level="ERROR",
                ),
                ephemeral=True,
            )

        if not is_bot_admin(interaction):
            return await interaction.response.send_message(
                embed=make_embed(
                    title="Permission Denied",
                    description=
                    "You are not allowed to configure verification.",
                    level="ERROR",
                ),
                ephemeral=True,
            )

        view = VerifySetupView(guild)

        await interaction.response.send_message(
            embed=make_embed(
                title="Verification Setup",
                description=
                (f"{EMOJIS['announcement']} Configure the verification system below.\n\n"
                 f"{EMOJIS['arrow_point']} Select:\n"
                 f"• Verification channel\n"
                 f"• Log channel\n"
                 f"• Verified role\n"
                 f"• Optional unverified role\n\n"
                 f"{EMOJIS['warning']} Settings are saved only after clicking **Save & Post Verify Message**."
                 ),
                level="SYSTEM",
            ),
            view=view,
            ephemeral=True,
        )


async def setup(bot: commands.Bot):
    await bot.add_cog(VerifySetup(bot))
