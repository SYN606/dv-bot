import discord
from discord.ext import commands
from utils.core.embeds import make_embed
from utils.core.emojis import EMOJIS
from db.db_helpers.channel_command_restrict import is_command_restricted


async def channel_command_check(ctx: commands.Context) -> bool:
    if ctx.guild is None or ctx.command is None:
        return True

    command_name = ctx.command.qualified_name.lower()
    blocked = is_command_restricted(ctx.guild.id, ctx.channel.id, command_name)

    if not blocked:
        return True

    try:
        await ctx.reply(embed=make_embed(
            title="Command Restricted",
            description=
            (f"{EMOJIS['fail']} This command cannot be used in this channel.\n\n"
             f"{EMOJIS['arrow_point']} Please try another channel."),
            level="WARNING",
        ),
                        mention_author=False)
    except discord.HTTPException:
        pass

    return False
