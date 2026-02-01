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
                    "You are not allowed to manage sticky messages.",
                    level="ERROR",
                ),
                ephemeral=True,
            )
            return

        set_sticky(interaction.guild.id, channel.id, message)

        embed = make_embed(
            title="Sticky Message Updated",
            description=
            (f"{EMOJIS['success']} Sticky message has been **enabled** in {channel.mention}."
             ),
            level="SUCCESS",
        )

        await interaction.response.send_message(embed=embed, ephemeral=True)

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
                    "You are not allowed to manage sticky messages.",
                    level="ERROR",
                ),
                ephemeral=True,
            )
            return

        removed = remove_sticky(interaction.guild.id, channel.id)

        embed = make_embed(
            title="Sticky Message Updated",
            description=
            (f"{EMOJIS['success']} Sticky message has been **disabled** in {channel.mention}."
             if removed else
             f"{EMOJIS['warning']} No sticky message was set for {channel.mention}."
             ),
            level="SUCCESS" if removed else "WARNING",
        )

        await interaction.response.send_message(embed=embed, ephemeral=True)

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
            title="Sticky Message Status",
            description=
            (f"{EMOJIS['green_dot']} Sticky is **enabled** in {channel.mention}.\n\n"
             f"{EMOJIS['arrow_point']} **Message:**\n{content}" if content else
             f"{EMOJIS['red_dot']} No sticky message is set in {channel.mention}."
             ),
            level="INFO",
            footer="Sticky messages repost automatically after new messages",
        )

        await interaction.response.send_message(embed=embed, ephemeral=True)


async def setup(bot: commands.Bot):
    await bot.add_cog(Sticky(bot))
