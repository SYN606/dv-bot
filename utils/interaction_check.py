import discord

from utils.embeds import make_embed
from db.db_helpers.commands import is_command_disabled


async def command_toggle_check(interaction: discord.Interaction) -> bool:
    """
    Global slash-command interaction check.
    Blocks disabled commands for EVERYONE.
    """

    if interaction.guild is None or interaction.command is None:
        return True

    command_name = interaction.command.qualified_name.lower()

    if is_command_disabled(interaction.guild.id, command_name):
        embed = make_embed(
            title="Command Disabled",
            description="This command has been disabled by server admins.",
            level="WARNING",
        )

        # Safe response handling (prevents 'interaction failed')
        if interaction.response.is_done():
            await interaction.followup.send(
                embed=embed,
                ephemeral=True,
            )
        else:
            await interaction.response.send_message(
                embed=embed,
                ephemeral=True,
            )

        return False

    return True
