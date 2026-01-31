import discord
from discord.ext import commands
from discord import app_commands

from utils.embeds import make_embed
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
        """
        Check if a slash command or subcommand exists.
        """
        name = name.lower().strip()
        for cmd in self.bot.tree.walk_commands():
            if cmd.qualified_name.lower() == name:
                return True
        return False

    def _is_protected(self, name: str) -> bool:
        """
        Check if command is protected from disabling.
        """
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
                    description=
                    "You do not have permission to manage commands.",
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
                    description=f"`/{command_name}` is not a valid command.",
                    level="ERROR",
                ),
                ephemeral=True,
            )
            return

        if self._is_protected(command_name):
            await interaction.response.send_message(
                embed=make_embed(
                    title="Protected Command",
                    description=f"`/{command_name}` cannot be disabled.",
                    level="WARNING",
                ),
                ephemeral=True,
            )
            return

        added = disable_command(interaction.guild.id, command_name)

        await interaction.response.send_message(embed=make_embed(
            title="Command Disabled",
            description=(f"`/{command_name}` has been disabled." if added else
                         f"`/{command_name}` is already disabled."),
            level="SUCCESS" if added else "WARNING",
        ))

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
                    description=
                    "You do not have permission to manage commands.",
                    level="ERROR",
                ),
                ephemeral=True,
            )
            return

        command_name = command_name.strip().lower()

        removed = enable_command(interaction.guild.id, command_name)

        await interaction.response.send_message(embed=make_embed(
            title="Command Enabled",
            description=(f"`/{command_name}` has been enabled." if removed else
                         f"`/{command_name}` was not disabled."),
            level="SUCCESS" if removed else "WARNING",
        ))

    @app_commands.command(
        name="command_status",
        description="List disabled commands in this server",
    )
    async def command_status(self, interaction: discord.Interaction):
        if interaction.guild is None:
            return

        disabled = get_disabled_commands(interaction.guild.id)

        await interaction.response.send_message(embed=make_embed(
            title="Disabled Commands",
            description=("\n".join(
                f"`/{c}`" for c in sorted(disabled)
            ) if disabled else "No commands are disabled."),
            level="INFO",
        ))


async def setup(bot: commands.Bot):
    await bot.add_cog(CommandControl(bot))
