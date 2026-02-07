import discord
from discord.ext import commands

from utils.embeds import make_embed
from utils.emojis import EMOJIS
from db.db_helpers.channel_command_restrict import is_command_restricted


async def channel_command_check(ctx: commands.Context) -> bool:
    """
    Prevents prefix commands in restricted channels.
    """

    if ctx.guild is None:
        return True

    command_name = ctx.command.name.lower()  # type: ignore

    blocked = is_command_restricted(
        ctx.guild.id,
        ctx.channel.id,
        command_name,
    )

    if not blocked:
        return True

    await ctx.reply(
        embed=make_embed(
            title="Command Restricted",
            description=
            (f"{EMOJIS['fail']} This command is not allowed in this channel.\n\n"
             f"{EMOJIS['arrow_point']} Try using it in another channel."),
            level="WARNING",
        ),
        mention_author=False,
    )

    return False
