import discord
from utils.embeds import make_embed
from utils.emojis import EMOJIS
from db.db_helpers.channel_command_restrict import is_command_restricted


async def command_toggle_check(interaction: discord.Interaction) -> bool:
    """
    v2 Command toggle check (CHANNEL-BASED)

    - Blocks restricted commands per channel
    - Sends a clean ephemeral notice
    - Fully async-safe
    """

    # region Safety
    if (interaction.guild is None or interaction.channel is None
            or interaction.command is None):
        return True

    guild_id = interaction.guild.id
    channel_id = interaction.channel.id  # type: ignore
    command_name = interaction.command.qualified_name.lower()

    # MUST await async DB call
    restricted = await is_command_restricted(
        guild_id=guild_id,
        channel_id=channel_id,
        command_name=command_name,
    )

    if not restricted:
        return True

    embed = make_embed(
        title="Command Restricted",
        description=
        (f"{EMOJIS['warning']} This command is **not allowed in this channel**.\n\n"
         f"{EMOJIS['arrow_point']} Try using it in another channel or contact staff."
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
