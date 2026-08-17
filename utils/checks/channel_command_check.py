import discord
from discord.ext import commands

from db.db_helpers.channel_command_restrict import is_command_restricted
from utils.core.embeds import make_embed
from utils.core.emojis import EMOJIS


async def channel_command_check(ctx: commands.Context) -> bool:
    """
    Global command check to prevent restricted commands from running in designated channels.
    """
    if ctx.guild is None or ctx.command is None:
        return True

    command_name = ctx.command.qualified_name.lower()
    blocked = await is_command_restricted(
        guild_id=ctx.guild.id,
        channel_id=ctx.channel.id,
        command_name=command_name,
    )

    if not blocked:
        return True

    embed = make_embed(
        title="Command Restricted",
        description=(
            f"{EMOJIS['fail']} This command cannot be used in this channel.\n\n"
            f"{EMOJIS['arrow_point']} Please try using it in another channel."
        ),
        level="ERROR",
    )

    try:
        if ctx.interaction and not ctx.interaction.response.is_done():
            await ctx.interaction.response.send_message(
                embed=embed,
                ephemeral=True,
            )
        else:
            await ctx.reply(embed=embed, mention_author=False)
    except (discord.HTTPException, discord.NotFound):
        pass

    return False
