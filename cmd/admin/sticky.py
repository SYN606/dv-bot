import discord
from discord.ext import commands
from discord import app_commands

from utils.embeds import make_embed
from utils.emojis import EMOJIS
from utils.check_perms import is_bot_admin
from db.db_helpers.sticky import (
    set_sticky,
    remove_sticky,
    get_sticky,
)


class Sticky(commands.Cog):

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @app_commands.command(name="sticky_set")
    async def sticky_set(
        self,
        interaction: discord.Interaction,
        channel: discord.TextChannel,
        message: str,
    ):

        await interaction.response.defer(ephemeral=True)

        if interaction.guild is None:
            return

        if not is_bot_admin(interaction):
            await interaction.followup.send(
                embed=make_embed(
                    title="Permission Denied",
                    description=
                    "You are not allowed to manage sticky messages.",
                    level="ERROR",
                ),
                ephemeral=True,
            )
            return

        await set_sticky(interaction.guild.id, channel.id, message)

        await interaction.followup.send(
            embed=make_embed(
                title="Sticky Enabled",
                description=
                f"{EMOJIS['success']} Enabled in {channel.mention}.",
                level="SUCCESS",
            ),
            ephemeral=True,
        )

    @app_commands.command(name="sticky_disable")
    async def sticky_disable(
        self,
        interaction: discord.Interaction,
        channel: discord.TextChannel,
    ):

        await interaction.response.defer(ephemeral=True)

        if interaction.guild is None:
            return

        if not is_bot_admin(interaction):
            await interaction.followup.send(
                embed=make_embed(
                    title="Permission Denied",
                    description=
                    "You are not allowed to manage sticky messages.",
                    level="ERROR",
                ),
                ephemeral=True,
            )
            return

        removed = await remove_sticky(interaction.guild.id, channel.id)

        await interaction.followup.send(
            embed=make_embed(
                title="Sticky Updated",
                description=(
                    f"{EMOJIS['success']} Disabled in {channel.mention}."
                    if removed else f"{EMOJIS['warning']} No sticky set."),
                level="SUCCESS" if removed else "WARNING",
            ),
            ephemeral=True,
        )

    @app_commands.command(name="sticky_status")
    async def sticky_status(
        self,
        interaction: discord.Interaction,
        channel: discord.TextChannel,
    ):

        await interaction.response.defer(ephemeral=True)

        content = await get_sticky(interaction.guild.id, channel.id)

        await interaction.followup.send(
            embed=make_embed(
                title="Sticky Status",
                description=
                (f"{EMOJIS['green_dot']} Enabled in {channel.mention}\n\n{content}"
                 if content else f"{EMOJIS['red_dot']} Not enabled."),
                level="INFO",
            ),
            ephemeral=True,
        )


async def setup(bot: commands.Bot):
    await bot.add_cog(Sticky(bot))
