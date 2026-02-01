import discord
from discord.ext import commands
from discord import app_commands

from utils.embeds import make_embed
from utils.emojis import EMOJIS
from utils.check_perms import is_bot_admin
from utils.protected_commands import PROTECTED_COMMANDS
from db.db_helpers.commands import (
    disable_command,
    enable_command,
    get_disabled_commands,
)


class CommandControl(commands.Cog):

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    def _command_exists(self, name: str) -> bool:
        name = name.lower().strip()
        for cmd in self.bot.tree.walk_commands():
            if cmd.qualified_name.lower() == name:
                return True
        return False

    def _is_protected(self, name: str) -> bool:
        return name in PROTECTED_COMMANDS

    @app_commands.command(
        name="command_disable",
        description="Disable a bot command in this server",
    )
    @app_commands.describe(
        command_name="Full slash command name (e.g. weather, sticky set)", )
    async def command_disable(
        self,
        interaction: discord.Interaction,
        command_name: str,
    ):
        if interaction.guild is None:
            return

        if not is_bot_admin(interaction):
            await interaction.response.send_message(
                embed=make_embed(
                    title="Permission Denied",
                    description="You are not allowed to manage bot commands.",
                    level="ERROR",
                ),
                ephemeral=True,
            )
            return

        command_name = command_name.strip().lower()

        if not self._command_exists(command_name):
            await interaction.response.send_message(
                embed=make_embed(
                    title="Unknown Command",
                    description=
                    f"{EMOJIS['fail']} `/{command_name}` does not exist.",
                    level="ERROR",
                ),
                ephemeral=True,
            )
            return

        if self._is_protected(command_name):
            await interaction.response.send_message(
                embed=make_embed(
                    title="Protected Command",
                    description=
                    (f"{EMOJIS['warning']} `/{command_name}` cannot be disabled."
                     ),
                    level="WARNING",
                ),
                ephemeral=True,
            )
            return

        added = disable_command(interaction.guild.id, command_name)

        embed = make_embed(
            title="Command Status Updated",
            description=(
                f"{EMOJIS['success']} `/{command_name}` has been disabled."
                if added else
                f"{EMOJIS['warning']} `/{command_name}` is already disabled."),
            level="SUCCESS" if added else "WARNING",
        )

        await interaction.response.send_message(embed=embed, ephemeral=True)

    @app_commands.command(
        name="command_enable",
        description="Enable a previously disabled command",
    )
    @app_commands.describe(
        command_name="Full slash command name (e.g. weather, sticky set)", )
    async def command_enable(
        self,
        interaction: discord.Interaction,
        command_name: str,
    ):
        if interaction.guild is None:
            return

        if not is_bot_admin(interaction):
            await interaction.response.send_message(
                embed=make_embed(
                    title="Permission Denied",
                    description="You are not allowed to manage bot commands.",
                    level="ERROR",
                ),
                ephemeral=True,
            )
            return

        command_name = command_name.strip().lower()

        removed = enable_command(interaction.guild.id, command_name)

        embed = make_embed(
            title="Command Status Updated",
            description=(
                f"{EMOJIS['success']} `/{command_name}` has been enabled."
                if removed else
                f"{EMOJIS['warning']} `/{command_name}` was not disabled."),
            level="SUCCESS" if removed else "WARNING",
        )

        await interaction.response.send_message(embed=embed, ephemeral=True)

    @app_commands.command(
        name="command_status",
        description="List disabled commands in this server",
    )
    async def command_status(self, interaction: discord.Interaction):
        if interaction.guild is None:
            return

        disabled = get_disabled_commands(interaction.guild.id)

        embed = make_embed(
            title="Disabled Commands",
            description=(
                "\n".join(f"{EMOJIS['arrow_point']} `/{c}`"
                          for c in sorted(disabled)) if disabled else
                f"{EMOJIS['success']} No commands are currently disabled."),
            level="INFO",
            footer="Only bot admins can modify command availability",
        )

        await interaction.response.send_message(embed=embed, ephemeral=True)


async def setup(bot: commands.Bot):
    await bot.add_cog(CommandControl(bot))
