import discord
from discord.ext import commands
import time

from utils.core.embeds import make_embed
from utils.views.base_media_view import BaseMediaView

# =====================================================
# CACHE 
# =====================================================
_banner_cache: dict[int, tuple[float, str | None]] = {}
CACHE_TTL = 30  # seconds


class Banner(commands.Cog):
    """
    Prefix banner command.
    Displays a user's banner (global or server-specific).
    """

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    # =====================================================
    # COMMAND
    # =====================================================
    @commands.command(
        name="banner",
        help="Display the banner of a user",
    )
    @commands.dynamic_cooldown(
        lambda ctx: None if isinstance(ctx.author, discord.Member) and ctx.
        author.guild_permissions.manage_guild else commands.Cooldown(1, 5),
        commands.BucketType.user,
    )
    async def banner(
        self,
        ctx: commands.Context,
        user: discord.Member | discord.User | None = None,
    ) -> None:

        target = user or ctx.author

        # =====================================================
        # RESOLVE MEMBER (SAFE)
        # =====================================================
        member: discord.Member | None = None
        if ctx.guild:
            member = ctx.guild.get_member(target.id)

        # =====================================================
        # GLOBAL BANNER (WITH CACHE)
        # =====================================================
        now = time.time()
        cache = _banner_cache.get(target.id)

        if cache and now - cache[0] < CACHE_TTL:
            global_banner = cache[1]
        else:
            try:
                fetched_user = await self.bot.fetch_user(target.id)
                global_banner = (fetched_user.banner.url
                                 if fetched_user.banner else None)
                _banner_cache[target.id] = (now, global_banner)
            except discord.HTTPException:
                global_banner = None

        # =====================================================
        # SERVER BANNER
        # =====================================================
        server_banner = (member.guild_banner.url
                         if member and member.guild_banner else None)

        # =====================================================
        # NO BANNER
        # =====================================================
        if not global_banner and not server_banner:

            await ctx.send(embed=make_embed(
                title="User Banner",
                description=
                f"{target.mention} does not have a banner configured.",
                level="WARNING",
                footer=f"Requested by {ctx.author}",
            ))
            return

        # =====================================================
        # TOGGLE VIEW
        # =====================================================
        if global_banner and server_banner:

            view = BaseMediaView(
                requester_id=ctx.author.id,
                requester_name=str(ctx.author),
                global_url=global_banner,
                server_url=server_banner,
                active="server",
                title="User Banner",
                server_label="Server Banner",
                global_label="Global Banner",
            )

            embed = view.build_embed()

            message = await ctx.send(embed=embed, view=view)
            view.message = message

        # =====================================================
        # SINGLE BANNER
        # =====================================================
        else:

            banner_url = server_banner or global_banner

            embed = make_embed(
                title="User Banner",
                description=f"Banner for {target.mention}.",
                level="INFO",
                footer=f"Requested by {ctx.author}",
            )

            embed.set_image(url=banner_url)

            await ctx.send(embed=embed)

        # =====================================================
        # CLEANUP
        # =====================================================
        try:
            await ctx.message.delete()
        except discord.HTTPException:
            pass

    # =====================================================
    # ERROR HANDLER
    # =====================================================
    @banner.error
    async def banner_error(self, ctx: commands.Context, error):

        if isinstance(error, commands.CommandOnCooldown):
            await ctx.send(embed=make_embed(
                title="Cooldown Active",
                description=f"Try again in **{round(error.retry_after, 1)}s**.",
                level="WARNING",
            ))


async def setup(bot: commands.Bot):
    await bot.add_cog(Banner(bot))
