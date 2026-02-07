import discord
from discord.ext import commands
from discord import app_commands

from utils.embeds import make_embed
from utils.emojis import EMOJIS
from utils.check_perms import is_bot_admin
from utils.views.command_view import CommandControlView


class CommandControl(commands.Cog):
    """
    v2 Command Control Panel

    Manage enabling/disabling commands
    using a single interactive interface.
    """

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @app_commands.command(
        name="command",
        description="Manage bot commands (enable / disable / status)",
    )
    async def command(self, interaction: discord.Interaction) -> None:

        guild = interaction.guild
        if guild is None:
            return await interaction.response.send_message(
                embed=make_embed(
                    title="Invalid Context",
                    description=
                    f"{EMOJIS['fail']} This command must be used in a server.",
                    level="ERROR",
                ),
                ephemeral=True,
            )

        if not is_bot_admin(interaction):
            return await interaction.response.send_message(
                embed=make_embed(
                    title="Permission Denied",
                    description=
                    f"{EMOJIS['fail']} You are not allowed to manage commands.",
                    level="ERROR",
                ),
                ephemeral=True,
            )

        view = CommandControlView(
            bot=self.bot,
            guild=guild,
            actor_id=interaction.user.id,
        )

        embed = make_embed(
            title="Command Control Panel",
            description=
            (f"{EMOJIS['announcement']} Manage bot command availability.\n\n"
             f"{EMOJIS['arrow_point']} Disable commands per server\n"
             f"{EMOJIS['arrow_point']} Protected commands cannot be disabled"),
            level="SYSTEM",
        )

        await interaction.response.send_message(
            embed=embed,
            view=view,
            ephemeral=True,
        )

        view.message = await interaction.original_response()


async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(CommandControl(bot))
