import discord
from discord.ext import commands
from discord import app_commands

from utils.embeds import make_embed
from utils.check_perms import is_bot_admin
from db.db_helpers.sticky import (
    set_sticky,
    remove_sticky,
    get_sticky,
)


class Sticky(commands.Cog):

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @app_commands.command(
        name="sticky_set",
        description="Set a sticky message for a channel",
    )
    @app_commands.describe(
        channel="Channel where the sticky message will be posted",
        message="The sticky message content",
    )
    async def sticky_set(
        self,
        interaction: discord.Interaction,
        channel: discord.TextChannel,
        message: str,
    ):
        if interaction.guild is None:
            return

        if not is_bot_admin(interaction):
            await interaction.response.send_message(
                embed=make_embed(
                    title="Permission Denied",
                    description=
                    "You do not have permission to manage sticky messages.",
                    level="ERROR",
                ),
                ephemeral=True,
            )
            return

        set_sticky(interaction.guild.id, channel.id, message)

        await interaction.response.send_message(embed=make_embed(
            title="Sticky Message Set",
            description=f"Sticky message enabled in {channel.mention}.",
            level="SUCCESS",
        ))

    @app_commands.command(
        name="sticky_disable",
        description="Disable sticky message in a channel",
    )
    @app_commands.describe(
        channel="Channel to disable the sticky message in", )
    async def sticky_disable(
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
                    description=
                    "You do not have permission to manage sticky messages.",
                    level="ERROR",
                ),
                ephemeral=True,
            )
            return

        removed = remove_sticky(interaction.guild.id, channel.id)

        await interaction.response.send_message(embed=make_embed(
            title="Sticky Disabled",
            description=(
                f"Sticky message disabled in {channel.mention}." if removed
                else f"No sticky message found for {channel.mention}."),
            level="SUCCESS" if removed else "WARNING",
        ))

    @app_commands.command(
        name="sticky_status",
        description="Check sticky message status for a channel",
    )
    @app_commands.describe(channel="Channel to check sticky status for", )
    async def sticky_status(
        self,
        interaction: discord.Interaction,
        channel: discord.TextChannel,
    ):
        if interaction.guild is None:
            return

        content = get_sticky(interaction.guild.id, channel.id)

        embed = make_embed(
            title="Sticky Status",
            description=(f"Sticky is **enabled** in {channel.mention}.\n\n"
                         f"Message:\n{content}" if content else
                         f"No sticky message set in {channel.mention}."),
            level="INFO",
        )

        await interaction.response.send_message(embed=embed)


async def setup(bot: commands.Bot):
    await bot.add_cog(Sticky(bot))
