import discord
from discord import app_commands
from discord.ext import commands

from utils.permissions.base_admin import BaseAdminCog
from utils.core.embeds import make_embed
from utils.core.emojis import EMOJIS
from utils.logging.mod_log import send_mod_log

from db.db_helpers.verification import (
    get_verification_config,
    delete_verification_config,
)


class ResetVerification(BaseAdminCog):
    """
    Disable and fully reset the verification system.
    Admin-only.
    """

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @app_commands.command(
        name="reset_verification",
        description="Reset and disable the verification system",
    )
    async def reset_verification(self, interaction: discord.Interaction):

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

        # Permission auto-handled by BaseAdminCog

        config = await get_verification_config(guild.id)

        if not config:
            return await interaction.response.send_message(
                embed=make_embed(
                    title="Verification Not Configured",
                    description="Verification is already disabled.",
                    level="INFO",
                ),
                ephemeral=True,
            )

        # ─────────────────────────
        # Remove verification message
        # ─────────────────────────
        if config.verification_message_id:
            channel = guild.get_channel(config.verify_channel_id)

            if isinstance(channel, discord.TextChannel):
                try:
                    msg = await channel.fetch_message(
                        config.verification_message_id)
                    await msg.delete()
                except (discord.NotFound, discord.Forbidden):
                    pass

        # ─────────────────────────
        # Delete DB configuration
        # ─────────────────────────
        await delete_verification_config(guild.id)

        await interaction.response.send_message(
            embed=make_embed(
                title="Verification Reset",
                description=(
                    f"{EMOJIS['success']} Verification system disabled.\n\n"
                    f"{EMOJIS['arrow_point']} Verification message removed."),
                level="SUCCESS",
                footer=f"Action by {interaction.user}",
            ),
            ephemeral=True,
        )

        # ─────────────────────────
        # Structured Logging
        # ─────────────────────────
        await send_mod_log(
            guild=guild,
            category="VERIFY",
            title="Verification Reset",
            description="Verification system has been disabled.",
            level="WARNING",
            actor=interaction.user,
            extra_fields={
                "Verification Channel ID":
                config.verify_channel_id,
                "Verified Role ID":
                config.verified_role_id,
                "Unverified Role ID":
                config.unverified_role_id
                if config.unverified_role_id else "None",
            },
        )


async def setup(bot: commands.Bot):
    await bot.add_cog(ResetVerification(bot))
