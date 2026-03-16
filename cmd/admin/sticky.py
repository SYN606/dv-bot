import discord
from discord.ext import commands
from discord import app_commands

from utils.permissions.base_admin import BaseAdminCog
from utils.core.embeds import make_embed
from utils.core.emojis import EMOJIS
from utils.logging.mod_log import send_mod_log

from db.db_helpers.sticky import (
    set_sticky,
    remove_sticky,
    get_sticky,
)


class Sticky(BaseAdminCog):
    """
    Sticky message configuration system.
    Admin-only.
    """

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    # ─────────────────────────
    # SET STICKY
    # ─────────────────────────
    @app_commands.command(name="sticky_set")
    @app_commands.describe(
        channel="Channel where sticky should be enabled",
        message="Sticky message content",
    )
    async def sticky_set(
        self,
        interaction: discord.Interaction,
        channel: discord.TextChannel,
        message: str,
    ):
        guild = interaction.guild
        if guild is None:
            return await interaction.response.send_message(
                embed=make_embed(
                    title="Invalid Context",
                    description="This command must be used in a server.",
                    level="ERROR",
                ),
                ephemeral=True,
            )

        if not message.strip():
            return await interaction.response.send_message(
                embed=make_embed(
                    title="Invalid Message",
                    description="Sticky message cannot be empty.",
                    level="WARNING",
                ),
                ephemeral=True,
            )

        await interaction.response.defer(ephemeral=True)

        await set_sticky(guild.id, channel.id, message)

        await interaction.followup.send(
            embed=make_embed(
                title="Sticky Enabled",
                description=
                f"{EMOJIS['success']} Sticky enabled in {channel.mention}.",
                level="SUCCESS",
            ),
            ephemeral=True,
        )

        # Logging
        await send_mod_log(
            guild=guild,
            category="CONFIG",
            title="Sticky Enabled",
            description=f"Sticky message enabled in {channel.mention}.",
            level="SUCCESS",
            actor=interaction.user,
            extra_fields={
                "Channel ID": channel.id,
            },
        )

    # ─────────────────────────
    # DISABLE STICKY
    # ─────────────────────────
    @app_commands.command(name="sticky_disable")
    @app_commands.describe(channel="Channel where sticky should be disabled", )
    async def sticky_disable(
        self,
        interaction: discord.Interaction,
        channel: discord.TextChannel,
    ):
        guild = interaction.guild
        if guild is None:
            return

        await interaction.response.defer(ephemeral=True)

        removed = await remove_sticky(guild.id, channel.id)

        await interaction.followup.send(
            embed=make_embed(
                title="Sticky Updated",
                description=
                (f"{EMOJIS['success']} Sticky disabled in {channel.mention}."
                 if removed else
                 f"{EMOJIS['warning']} No sticky configured in that channel."),
                level="SUCCESS" if removed else "WARNING",
            ),
            ephemeral=True,
        )

        if removed:
            await send_mod_log(
                guild=guild,
                category="CONFIG",
                title="Sticky Disabled",
                description=f"Sticky disabled in {channel.mention}.",
                level="INFO",
                actor=interaction.user,
                extra_fields={
                    "Channel ID": channel.id,
                },
            )

    # ─────────────────────────
    # STICKY STATUS
    # ─────────────────────────
    @app_commands.command(name="sticky_status")
    @app_commands.describe(channel="Channel to check sticky status", )
    async def sticky_status(
        self,
        interaction: discord.Interaction,
        channel: discord.TextChannel,
    ):
        guild = interaction.guild
        if guild is None:
            return

        await interaction.response.defer(ephemeral=True)

        content = await get_sticky(guild.id, channel.id)

        await interaction.followup.send(
            embed=make_embed(
                title="Sticky Status",
                description=
                (f"{EMOJIS['green_dot']} Enabled in {channel.mention}\n\n{content}"
                 if content else
                 f"{EMOJIS['red_dot']} Sticky not enabled in {channel.mention}."
                 ),
                level="INFO",
            ),
            ephemeral=True,
        )


async def setup(bot: commands.Bot):
    await bot.add_cog(Sticky(bot))
