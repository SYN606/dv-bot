import discord
from discord import app_commands
from discord.ext import commands

from utils.check_perms import is_bot_admin
from utils.embeds import make_embed
from utils.emojis import EMOJIS

from db.db_helpers.verification import (
    is_verification_configured,
    delete_verification_config,
)


class ResetVerification(commands.Cog):
    """
    Slash command:
    /reset_verification

    Completely disables the verification system for this server.
    """

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @app_commands.command(
        name="reset_verification",
        description="Reset and disable the verification system for this server",
    )
    async def reset_verification(
        self,
        interaction: discord.Interaction,
    ):
        guild = interaction.guild
        if guild is None:
            return await interaction.response.send_message(
                embed=make_embed(
                    title="Invalid Context",
                    description=
                    "This command can only be used inside a server.",
                    level="ERROR",
                ),
                ephemeral=True,
            )

        # ─────────────────────────
        # PERMISSION CHECK
        # ─────────────────────────
        if not is_bot_admin(interaction):
            return await interaction.response.send_message(
                embed=make_embed(
                    title="Permission Denied",
                    description="You are not allowed to reset verification.",
                    level="ERROR",
                ),
                ephemeral=True,
            )

        # ─────────────────────────
        # CHECK IF CONFIGURED
        # ─────────────────────────
        if not is_verification_configured(guild.id):
            return await interaction.response.send_message(
                embed=make_embed(
                    title="Verification Not Configured",
                    description=
                    f"{EMOJIS['warning']} Verification is already disabled for this server.",
                    level="INFO",
                ),
                ephemeral=True,
            )

        # ─────────────────────────
        # DELETE CONFIG
        # ─────────────────────────
        deleted = delete_verification_config(guild.id)

        if not deleted:
            return await interaction.response.send_message(
                embed=make_embed(
                    title="Reset Failed",
                    description=
                    f"{EMOJIS['fail']} Unable to reset verification. Try again.",
                    level="ERROR",
                ),
                ephemeral=True,
            )

        # ─────────────────────────
        # CONFIRMATION
        # ─────────────────────────
        await interaction.response.send_message(
            embed=make_embed(
                title="Verification Reset",
                description=
                (f"{EMOJIS['success']} Verification system has been **disabled**.\n\n"
                 f"{EMOJIS['arrow_point']} You can run `/verify_setup` to configure it again."
                 ),
                level="SUCCESS",
                footer=f"Action by {interaction.user}",
            ),
            ephemeral=True,
        )


async def setup(bot: commands.Bot):
    await bot.add_cog(ResetVerification(bot))
