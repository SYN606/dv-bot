import discord
from discord import app_commands
from discord.ext import commands

from utils.check_perms import is_bot_admin
from utils.embeds import make_embed
from utils.emojis import EMOJIS

from db.db_helpers.mod_logs import set_log_channel


class SetupLog(commands.Cog):

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @app_commands.command(
        name="setup_log",
        description="Set the moderation log channel for this server",
    )
    @app_commands.describe(
        channel="Channel where all moderation logs will be sent", )
    async def setup_log(
        self,
        interaction: discord.Interaction,
        channel: discord.TextChannel,
    ):
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

        # PERMISSION CHECK
        if not await is_bot_admin(interaction):
            return await interaction.response.send_message(
                embed=make_embed(
                    title="Permission Denied",
                    description=
                    "You are not allowed to configure log channels.",
                    level="ERROR",
                ),
                ephemeral=True,
            )

        # SAVE CONFIG
        await set_log_channel(guild.id, channel.id)

        # CONFIRMATION
        await interaction.response.send_message(
            embed=make_embed(
                title="Log Channel Configured",
                description=
                (f"{EMOJIS['success']} Moderation logs will now be sent to {channel.mention}.\n\n"
                 f"{EMOJIS['arrow_point']} Tempbans, verification, and future mod actions "
                 f"will appear here."),
                level="SUCCESS",
                footer="Moderation system • Digital Vigital",
            ),
            ephemeral=True,
        )


async def setup(bot: commands.Bot):
    await bot.add_cog(SetupLog(bot))
