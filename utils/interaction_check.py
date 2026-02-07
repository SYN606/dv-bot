import discord

from utils.embeds import make_embed
from utils.emojis import EMOJIS
from db.db_helpers.channel_command_restrict import is_command_disabled


async def command_toggle_check(interaction: discord.Interaction) -> bool:
    """
    v2 Command toggle check

    - Blocks disabled commands
    - Sends a clean ephemeral notice
    - Safe for both initial & followup responses
    """

    # ─────────────────────────
    # Safety
    # ─────────────────────────
    if interaction.guild is None or interaction.command is None:
        return True

    command_name = interaction.command.qualified_name.lower()

    # ─────────────────────────
    # Disabled command check
    # ─────────────────────────
    if is_command_disabled(interaction.guild.id, command_name):
        embed = make_embed(
            title="Command Disabled",
            description=
            (f"{EMOJIS['warning']} This command has been disabled by server administrators.\n\n"
             f"{EMOJIS['arrow_point']} Please contact staff if you believe this is a mistake."
             ),
            level="WARNING",
        )

        try:
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
        except discord.HTTPException:
            pass

        return False

    return True
