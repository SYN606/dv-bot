import discord

from utils.embeds import make_embed
from db.db_helpers.commands import is_command_disabled


async def command_toggle_check(interaction: discord.Interaction) -> bool:

    # ── COMMAND DISABLED CHECK
    command_name = interaction.command.qualified_name.lower()  # type: ignore

    if is_command_disabled(interaction.guild.id, command_name):  # type: ignore
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
