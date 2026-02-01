import discord
from discord.ext import commands
from discord import app_commands

from utils.embeds import make_embed
from utils.emojis import EMOJIS
from utils.check_perms import is_bot_admin
from db.db_helpers.media_only import (
    enable_media_only,
    disable_media_only,
    is_media_only,
)


class MediaOnly(commands.Cog):

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @app_commands.command(
        name="media_only_enable",
        description="Restrict a channel to media-only messages",
    )
    async def enable(
        self,
        interaction: discord.Interaction,
        channel: discord.TextChannel,
    ):
        if interaction.guild is None:
            return

        if not is_bot_admin(interaction):
            await interaction.response.send_message(
                embed=make_embed(
                    title="Permission Denied",
                    description="You are not allowed to manage channel modes.",
                    level="ERROR",
                ),
                ephemeral=True,
            )
            return

        added = enable_media_only(interaction.guild.id, channel.id)

        embed = make_embed(
            title="Media-Only Mode",
            description=(
                f"{EMOJIS['success']} {channel.mention} is now **media-only**."
                if added else
                f"{EMOJIS['warning']} {channel.mention} is already media-only."
            ),
            level="SUCCESS" if added else "WARNING",
        )

        await interaction.response.send_message(embed=embed, ephemeral=True)

    @app_commands.command(
        name="media_only_disable",
        description="Disable media-only mode for a channel",
    )
    async def disable(
        self,
        interaction: discord.Interaction,
        channel: discord.TextChannel,
    ):
        if interaction.guild is None:
            return

        if not is_bot_admin(interaction):
            await interaction.response.send_message(
                embed=make_embed(
                    title="Permission Denied",
                    description="You are not allowed to manage channel modes.",
                    level="ERROR",
                ),
                ephemeral=True,
            )
            return

        removed = disable_media_only(interaction.guild.id, channel.id)

        embed = make_embed(
            title="Media-Only Mode",
            description=
            (f"{EMOJIS['success']} Media-only has been **disabled** for {channel.mention}."
             if removed else
             f"{EMOJIS['warning']} {channel.mention} was not media-only."),
            level="SUCCESS" if removed else "WARNING",
        )

        await interaction.response.send_message(embed=embed, ephemeral=True)

    @app_commands.command(
        name="media_only_status",
        description="Check if a channel is media-only",
    )
    async def status(
        self,
        interaction: discord.Interaction,
        channel: discord.TextChannel,
    ):
        if interaction.guild is None:
            return

        enabled = is_media_only(interaction.guild.id, channel.id)

        embed = make_embed(
            title="Media-Only Status",
            description=
            (f"{EMOJIS['green_dot']} {channel.mention} is currently **media-only**."
             if enabled else
             f"{EMOJIS['red_dot']} {channel.mention} is **not** media-only."),
            level="INFO",
            footer="Only bot admins can change this setting",
        )

        await interaction.response.send_message(embed=embed, ephemeral=True)


async def setup(bot: commands.Bot):
    await bot.add_cog(MediaOnly(bot))
