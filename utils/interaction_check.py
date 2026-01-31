import discord

from utils.embeds import make_embed
from db.db_helpers.commands import is_command_disabled
from utils.instance_manager import is_primary_instance


async def command_toggle_check(interaction: discord.Interaction) -> bool:
    """
    Global slash-command interaction check.

    Order:
    1. Allow only PRIMARY instance to execute commands
    2. Block disabled commands for everyone
    """

    # Safety
    if interaction.guild is None or interaction.command is None:
        return True

    # ── PRIMARY / SECONDARY CHECK
    if not is_primary_instance():
        # Secondary instances never execute commands
        try:
            if interaction.response.is_done():
                await interaction.followup.send(
                    "🟡 Standby instance — command handled by primary.",
                    ephemeral=True,
                )
            else:
                await interaction.response.send_message(
                    "🟡 Standby instance — command handled by primary.",
                    ephemeral=True,
                )
        except Exception:
            pass

        return False

    # ── COMMAND DISABLED CHECK
    command_name = interaction.command.qualified_name.lower()

    if is_command_disabled(interaction.guild.id, command_name):
        embed = make_embed(
            title="Command Disabled",
            description="This command has been disabled by server admins.",
            level="WARNING",
        )

        try:
            if interaction.response.is_done():
                await interaction.followup.send(embed=embed, ephemeral=True)
            else:
                await interaction.response.send_message(embed=embed,
                                                        ephemeral=True)
        except Exception:
            pass

        return False

    return True
