import discord
from discord.ext import commands

from utils.core.embeds import make_embed
from utils.core.emojis import EMOJIS

from utils.handlers.vc_mod_handlers.drag_handler import (
    drag_member,
)


class VCDrag(
    commands.Cog,
):
    def __init__(
        self,
        bot: commands.Bot,
    ):

        self.bot = bot

    @commands.hybrid_command(
        name="drag",
        description="Drag a member to your VC.",
    )
    @commands.has_permissions(
        move_members=True,
    )
    async def drag(
        self,
        ctx: commands.Context,
        member: discord.Member,
    ):

        author_vc = ctx.author.voice  # type: ignore

        if not author_vc or not author_vc.channel:
            await ctx.send(
                embed=make_embed(
                    title=(f"{EMOJIS['fail']} Not Connected"),
                    description=("You must be in a VC."),
                    level="ERROR",
                ),
            )

            return

        if not member.voice:
            await ctx.send(
                embed=make_embed(
                    title=(f"{EMOJIS['fail']} User Not Connected"),
                    description=(f"{member.mention} is not in a VC."),
                    level="ERROR",
                ),
            )

            return

        if member.voice.channel == author_vc.channel:
            await ctx.send(
                embed=make_embed(
                    title=(f"{EMOJIS['warning']} Same Voice Channel"),
                    description=(f"{member.mention} is already in your VC."),
                    level="WARNING",
                ),
            )

            return

        success = await drag_member(
            member,
            author_vc.channel,  # type: ignore
        )

        if not success:
            await ctx.send(
                embed=make_embed(
                    title=(f"{EMOJIS['fail']} Drag Failed"),
                    description=("Unable to move member."),
                    level="ERROR",
                ),
            )

            return

        await ctx.send(
            embed=make_embed(
                title=(f"{EMOJIS['success']} Member Dragged"),
                description=(
                    f"{EMOJIS['arrow_point']} "
                    f"{member.mention} "
                    f"was moved to "
                    f"{author_vc.channel.mention}"
                ),
                level="SUCCESS",
            ),
        )


async def setup(
    bot: commands.Bot,
):

    await bot.add_cog(
        VCDrag(bot),
    )
