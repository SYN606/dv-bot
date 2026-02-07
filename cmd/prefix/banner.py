import discord
from discord.ext import commands

from utils.embeds import make_embed
from utils.views.banner_view import BannerView


class Banner(commands.Cog):
    """
    User banner inspection commands.

    Displays a user's banner intelligently:
    - Shows a single banner when only one exists
    - Attaches interactive controls only when multiple distinct banners exist
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

        try:
            # Server context required for guild banners
            if ctx.guild is None:
                return

            target = user or ctx.author

            # ── Fetch full user (required for global banner)
            try:
                fetched_user = await self.bot.fetch_user(target.id)
            except discord.NotFound:
                return

            # ── Resolve member for server banner
            member: discord.Member | None = (target if isinstance(
                target, discord.Member) else ctx.guild.get_member(target.id))

            global_banner: str | None = (fetched_user.banner.url
                                         if fetched_user.banner else None)
            server_banner: str | None = (member.guild_banner.url if member
                                         and member.guild_banner else None)

            # ─────────────────────────────
            # No banners available
            # ─────────────────────────────
            if not global_banner and not server_banner:
                embed = make_embed(
                    title="User Banner",
                    description=
                    (f"{target.mention} does not have a banner configured.\n"
                     "Neither a global nor a server-specific banner is available."
                     ),
                    level="WARN",
                    footer=f"Requested by {ctx.author}",
                )

                await ctx.send(embed=embed)
                return

            # ─────────────────────────────
            # Determine banner strategy
            # ─────────────────────────────
            banners_are_distinct = (global_banner and server_banner
                                    and global_banner != server_banner)

            # ─────────────────────────────
            # Base embed
            # ─────────────────────────────
            embed = make_embed(
                title="User Banner",
                description=f"Banner for {target.mention}.",
                level="INFO",
                footer=f"Requested by {ctx.author}",
            )

            # Prefer server banner visually
            embed.set_image(url=server_banner or global_banner)

            # ─────────────────────────────
            # Conditional v2 interactive component
            # ─────────────────────────────
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

        finally:
            # ─────────────────────────────
            # Guaranteed command cleanup
            # ─────────────────────────────
            try:
                await ctx.message.delete()
            except (discord.Forbidden, discord.NotFound):
                pass


async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(Banner(bot))
