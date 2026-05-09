import discord
from discord.ext import commands

from utils.core.embeds import make_embed
from utils.core.emojis import EMOJIS

from utils.handlers.vc_mod_handlers.moveall_handler import (
    move_all_members, )


class VCMoveAll(
        commands.Cog, ):

    def __init__(
        self,
        bot: commands.Bot,
    ):

        self.bot = bot

    @commands.hybrid_command(
        name="moveall",
        aliases=[
            "dragall",
        ],
        description=("Move all users to your VC."),
    )
    @commands.has_permissions(move_members=True, )
    async def moveall(
        self,
        ctx: commands.Context,
        source: discord.VoiceChannel,
    ):

        author_vc = ctx.author.voice # type: ignore

        if not author_vc or not author_vc.channel:

            await ctx.send(embed=make_embed(
                title=(f"{EMOJIS['fail']} "
                       f"Not Connected"),
                description=("You must be in a VC."),
                level="ERROR",
            ), )

            return

        moved = await move_all_members(
            source,
            author_vc.channel, # type: ignore
        )

        await ctx.send(embed=make_embed(
            title=(f"{EMOJIS['success']} "
                   f"Members Moved"),
            description=(f"{EMOJIS['arrow_point']} "
                         f"Moved `{moved}` users "
                         f"to {author_vc.channel.mention}"),
            level="SUCCESS",
        ), )


async def setup(bot: commands.Bot, ):

    await bot.add_cog(VCMoveAll(bot))
