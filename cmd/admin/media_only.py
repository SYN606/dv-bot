import discord
from discord import app_commands
from discord.ext import commands

from utils.permissions.base_admin import BaseAdminCog
from utils.core.embeds import make_embed
from utils.core.emojis import EMOJIS
from utils.views.media_only_views import MediaOnlyView
from utils.logging.mod_log import send_mod_log


class MediaOnly(BaseAdminCog):
    """
    Media-only channel control panel.
    Admin-only.
    """

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @app_commands.command(
        name="media_only",
        description="Manage media-only mode for a channel",
    )
    @app_commands.describe(
        channel="Channel to manage (defaults to current channel)")
    async def media_only(
        self,
        interaction: discord.Interaction,
        channel: discord.TextChannel | None = None,
    ) -> None:

        guild = interaction.guild
        actor = interaction.user

        # =====================================================
        # CONTEXT VALIDATION
        # =====================================================
        if guild is None:
            await interaction.response.send_message(
                embed=make_embed(
                    title="Invalid Context",
                    description="This command can only be used in a server.",
                    level="ERROR",
                ),
                ephemeral=True,
            )
            return

        # =====================================================
        # RESOLVE CHANNEL
        # =====================================================
        target_channel = channel or interaction.channel

        if not isinstance(target_channel, discord.TextChannel):
            await interaction.response.send_message(
                embed=make_embed(
                    title="Invalid Channel",
                    description="Please select a valid text channel.",
                    level="ERROR",
                ),
                ephemeral=True,
            )
            return

        # =====================================================
        # CREATE VIEW
        # =====================================================
        view = MediaOnlyView(
            guild_id=guild.id,
            channel=target_channel,
            actor_id=actor.id,
        )

        embed = make_embed(
            title="Media-Only Channel Control",
            description=(
                f"{EMOJIS['announcement']} Manage **media-only mode** "
                f"for {target_channel.mention}.\n\n"
                f"{EMOJIS['green_dot']} Enable restrictions\n"
                f"{EMOJIS['red_dot']} Disable restrictions\n"
                f"{EMOJIS['ping']} Check current status\n\n"
                f"{EMOJIS['okay']} This panel is visible only to you."),
            level="SYSTEM",
            footer=f"Channel • #{target_channel.name}",
        )

        # =====================================================
        # SEND RESPONSE (SAFE)
        # =====================================================
        if interaction.response.is_done():
            message = await interaction.followup.send(
                embed=embed,
                view=view,
                ephemeral=True,
                wait=True,
            )
        else:
            await interaction.response.send_message(
                embed=embed,
                view=view,
                ephemeral=True,
            )
            message = await interaction.original_response()

        # Attach message to view
        view.message = message

        # =====================================================
        # LOGGING
        # =====================================================
        await send_mod_log(
            guild=guild,
            category="CONFIG",
            title="Media-Only Panel Opened",
            description=
            f"Media-only control opened for {target_channel.mention}.",
            level="INFO",
            actor=actor,
            extra_fields={
                "Channel ID": target_channel.id,
            },
        )


# =========================================================
# SETUP
# =========================================================
async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(MediaOnly(bot))
