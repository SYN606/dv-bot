import discord
from discord.ext import commands

from utils.embeds import make_embed
from utils.views.banner_view import BannerView


class Banner(commands.Cog):
    """
    Prefix banner command (optimised).
    """

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @commands.command(
        name="banner",
        help="Display the banner of a user",
    )
    async def banner(
        self,
        ctx: commands.Context,
        user: discord.Member | discord.User | None = None,
    ) -> None:

        if ctx.guild is None:
            return

        target = user or ctx.author

        # Resolve member (for guild banner)
        member = (target if isinstance(target, discord.Member) else
                  ctx.guild.get_member(target.id))

        # ─────────────────────────────
        # Fetch user only if necessary
        # ─────────────────────────────
        fetched_user = None

        if isinstance(target,
                      discord.User) and not isinstance(target, discord.Member):
            fetched_user = await self.bot.fetch_user(target.id)
        else:
            # Member objects sometimes already contain banner (discord.py 2.3+)
            fetched_user = await self.bot.fetch_user(target.id)

        global_banner = (fetched_user.banner.url
                         if fetched_user.banner else None)

        server_banner = (member.guild_banner.url
                         if member and member.guild_banner else None)

        if not global_banner and not server_banner:
            embed = make_embed(
                title="User Banner",
                description=(
                    f"{target.mention} does not have a banner configured."),
                level="WARNING",
                footer=f"Requested by {ctx.author}",
            )

            await ctx.send(embed=embed)
            return

        banners_are_distinct = (global_banner and server_banner
                                and global_banner != server_banner)

        embed = make_embed(
            title="User Banner",
            description=f"Banner for {target.mention}.",
            level="INFO",
            footer=f"Requested by {ctx.author}",
        )

        embed.set_image(url=server_banner or global_banner)

        if banners_are_distinct:
            view = BannerView(
                requester_id=ctx.author.id,
                global_url=global_banner,
                server_url=server_banner,
                active="server",
            )

            message = await ctx.send(embed=embed, view=view)
            view.message = message
        else:
            await ctx.send(embed=embed)

        # Non-blocking delete
        try:
            ctx.bot.loop.create_task(ctx.message.delete())
        except Exception:
            pass


async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(Banner(bot))
