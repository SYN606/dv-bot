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
        description="Manage media-only mode for this channel",
    )
    async def media_only(
        self,
        interaction: discord.Interaction,
    ) -> None:

        guild = interaction.guild
        channel = interaction.channel

        if guild is None or not isinstance(channel, discord.TextChannel):
            return

        # Create control panel view
        view = MediaOnlyView(
            guild_id=guild.id,
            channel=channel,
            actor_id=interaction.user.id,
        )

        embed = make_embed(
            title="Media-Only Channel Control",
            description=(
                f"{EMOJIS['announcement']} Manage **media-only mode** "
                "for this channel.\n\n"
                f"{EMOJIS['green_dot']} Enable restrictions\n"
                f"{EMOJIS['red_dot']} Disable restrictions\n"
                f"{EMOJIS['ping']} Check current status\n\n"
                f"{EMOJIS['okay']} This panel is visible only to you."),
            level="SYSTEM",
            footer=f"Channel • #{channel.name}",
        )

        # Safe interaction response
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

        # Attach message to view for timeout editing
        view.message = message

        # Structured moderation logging
        await send_mod_log(
            guild=guild,
            category="CONFIG",
            title="Media-Only Panel Opened",
            description=f"Media-only control opened for {channel.mention}.",
            level="INFO",
            actor=interaction.user,
            extra_fields={
                "Channel ID": channel.id,
            },
        )


async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(MediaOnly(bot))
