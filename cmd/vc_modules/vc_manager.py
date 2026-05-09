from discord.ext import commands

from utils.core.embeds import make_embed
from utils.core.emojis import EMOJIS

from utils.views.vc_mod_views.manager_view import (
    VCManagerView,
)


class VCManager(
    commands.Cog,
):
    def __init__(
        self,
        bot: commands.Bot,
    ):

        self.bot = bot

    @commands.hybrid_command(
        name="vc_manager",
        aliases=[
            "vcm",
            "vcmanager",
        ],
        description=("Manage VC automation."),
    )
    @commands.has_permissions(
        administrator=True,
    )
    async def vc_manager(
        self,
        ctx: commands.Context,
    ):

        embed = make_embed(
            title=(f"{EMOJIS['developer']} VC Manager"),
            description=(
                f"{EMOJIS['arrow_point']} Manage VC tracking, roles and automation."
            ),
            level="INFO",
        )

        await ctx.send(
            embed=embed,
            view=VCManagerView(ctx.author.id),
        )


async def setup(
    bot: commands.Bot,
):

    await bot.add_cog(VCManager(bot))
