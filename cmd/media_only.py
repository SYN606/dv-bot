import discord
from discord import app_commands
from discord.ext import commands

from utils.check_perms import is_bot_admin
from utils.embeds import make_embed
from utils.emojis import EMOJIS
from utils.views.media_only_views import MediaOnlyView


class MediaOnly(commands.Cog):
    """
    Media-only channel control panel.

    Single-command, button-driven (v2 UX).
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
        # ─────────────────────────
        # Context validation
        # ─────────────────────────
        guild = interaction.guild
        channel = interaction.channel

        if guild is None or not isinstance(channel, discord.TextChannel):
            return

        # ─────────────────────────
        # Permission check
        # ─────────────────────────
        if not is_bot_admin(interaction):
            await interaction.response.send_message(
                embed=make_embed(
                    title="Permission Denied",
                    description=
                    (f"{EMOJIS['warning']} You do not have permission to manage channel modes.\n\n"
                     f"{EMOJIS['arrow_point']} Administrator access is required."
                     ),
                    level="ERROR",
                ),
                ephemeral=True,
            )
            return

        # ─────────────────────────
        # Build media-only control panel
        # ─────────────────────────
        view = MediaOnlyView(
            guild_id=guild.id,
            channel=channel,
            actor_id=interaction.user.id,
        )

        embed = make_embed(
            title="Media-Only Channel Control",
            description=
            (f"{EMOJIS['announcement']} Manage **media-only mode** for this channel.\n\n"
             f"{EMOJIS['arrow_point']} **Available actions:**\n"
             f"{EMOJIS['green_dot']} Enable media-only restrictions\n"
             f"{EMOJIS['red_dot']} Disable media-only restrictions\n"
             f"{EMOJIS['ping']} Check current status\n\n"
             f"{EMOJIS['okay']} This control panel is visible **only to you**."
             ),
            level="SYSTEM",
            footer=f"Channel • #{channel.name}",
        )

        await interaction.response.send_message(
            embed=embed,
            view=view,
            ephemeral=True,
        )


async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(MediaOnly(bot))
