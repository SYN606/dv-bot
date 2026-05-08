import discord

from db.db_helpers.channel_command_restrict import (
    is_command_restricted, )

from utils.core.embeds import make_embed
from utils.core.emojis import EMOJIS

_RESTRICT_CACHE: dict[
    tuple[int, int, str],
    bool,
] = {}


async def command_toggle_check(interaction: discord.Interaction, ) -> bool:
    """
    Channel-based command
    restriction system.

    Features:
    - async-safe
    - cached lookups
    - clean ephemeral responses
    - hierarchy bypass support
    """

    # safety
    if not interaction.guild:
        return True

    if not interaction.channel:
        return True

    if not interaction.command:
        return True

    if not isinstance(
            interaction.user,
            discord.Member,
    ):

        return True

    member = interaction.user

    # admin bypass
    if (member.guild_permissions.administrator):

        return True

    guild_id = (interaction.guild.id)

    channel_id = (interaction.channel.id)

    command_name = (interaction.command.qualified_name.lower())

    cache_key = (
        guild_id,
        channel_id,
        command_name,
    )

    restricted = _RESTRICT_CACHE.get(cache_key)

    # cache miss
    if restricted is None:

        restricted = (await is_command_restricted(
            guild_id=guild_id,
            channel_id=channel_id,
            command_name=command_name,
        ))

        _RESTRICT_CACHE[cache_key] = restricted

    # allowed
    if not restricted:
        return True

    embed = make_embed(
        title="Command Restricted",
        description=(f"{EMOJIS['warning']} "
                     f"This command is "
                     f"**not allowed "
                     f"in this channel**.\n\n"
                     f"{EMOJIS['arrow_point']} "
                     f"Try another channel "
                     f"or contact staff."),
        level="WARNING",
    )

    try:

        if (interaction.response.is_done()):

            await interaction.followup.send(
                embed=embed,
                ephemeral=True,
            )

        else:

            await interaction.response.send_message(
                embed=embed,
                ephemeral=True,
            )

    except (
            discord.Forbidden,
            discord.HTTPException,
    ):

        pass

    return False


def invalidate_command_restrict_cache(
    guild_id: int,
    channel_id: int,
    command_name: str,
) -> None:

    _RESTRICT_CACHE.pop(
        (
            guild_id,
            channel_id,
            command_name.lower(),
        ),
        None,
    )


def clear_guild_restrict_cache(guild_id: int, ) -> None:

    keys = [key for key in _RESTRICT_CACHE if key[0] == guild_id]

    for key in keys:

        _RESTRICT_CACHE.pop(
            key,
            None,
        )
