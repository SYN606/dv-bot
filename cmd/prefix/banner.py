import discord
from discord.ext import commands
import time

from utils.core.embeds import make_embed
from utils.views.base_media_view import BaseMediaView

_banner_cache: dict[int, tuple[float, str | None]] = {}

CACHE_TTL = 30

_global_last_used: dict[int, float] = {}

GLOBAL_COOLDOWN_DEFAULT = 3
GUILD_COOLDOWNS: dict[int, float] = {}


class Banner(commands.Cog):

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @commands.command(name="banner", help="Display banner of a user or server")
    @commands.dynamic_cooldown(
        lambda ctx: None if isinstance(ctx.author, discord.Member) and ctx.
        author.guild_permissions.manage_guild else commands.Cooldown(1, 5),
        commands.BucketType.user,
    )
    async def banner(
        self,
        ctx: commands.Context,
        arg: str | None = None,
        user: discord.Member | discord.User | None = None,
    ) -> None:

        guild_id = ctx.guild.id if ctx.guild else 0

        # resolve cooldown
        guild_cd = GUILD_COOLDOWNS.get(guild_id, GLOBAL_COOLDOWN_DEFAULT)

        now = time.time()

        last_used = _global_last_used.get(guild_id, 0)

        remaining = guild_cd - (now - last_used)

        if remaining > 0:

            await ctx.reply(
                embed=make_embed(
                    title="Cooldown",
                    description=
                    f"Please wait **{remaining:.1f}s** before using this command again.",
                    level="WARNING",
                ),
                mention_author=False,
            )
            return

        _global_last_used[guild_id] = now

        # server banner
        if arg and arg.lower() == "server":

            if not ctx.guild or not ctx.guild.banner:

                await ctx.reply(
                    embed=make_embed(
                        title="No Banner",
                        description="This server does not have a banner set.",
                        level="WARNING",
                    ),
                    mention_author=False,
                )
                return

            embed = make_embed(
                title="Server Banner",
                description=ctx.guild.name,
                level="INFO",
            )

            embed.set_image(url=ctx.guild.banner.url)

            embed.set_footer(
                text=f"Action by: {ctx.author}",
                icon_url=ctx.author.display_avatar.url,
            )

            await ctx.send(embed=embed)

            try:
                await ctx.message.delete()

            except discord.HTTPException:
                pass

            return

        # resolve target
        target = user or ctx.author

        # resolve member
        member = ctx.guild.get_member(target.id) if ctx.guild else None

        # resolve cached banner
        cache = _banner_cache.get(target.id)

        if cache and now - cache[0] < CACHE_TTL:

            global_banner = cache[1]

        else:

            try:

                fetched_user = await self.bot.fetch_user(target.id)

                global_banner = (fetched_user.banner.url
                                 if fetched_user.banner else None)

                _banner_cache[target.id] = (
                    now,
                    global_banner,
                )

            except discord.HTTPException:

                global_banner = None

        # resolve server banner
        server_banner = (member.guild_banner.url
                         if member and member.guild_banner else None)

        # no banners
        if not global_banner and not server_banner:

            await ctx.reply(
                embed=make_embed(
                    title="No Banner",
                    description=f"{target.mention} does not have a banner.",
                    level="WARNING",
                ),
                mention_author=False,
            )

            return

        # both banners
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

            embed.set_footer(
                text=f"Action by: {ctx.author}",
                icon_url=ctx.author.display_avatar.url,
            )

            message = await ctx.send(
                embed=embed,
                view=view,
            )

            view.message = message

        else:

            banner_url = server_banner or global_banner

            embed = make_embed(
                title="User Banner",
                description=target.mention,
                level="INFO",
            )

            embed.set_image(url=banner_url)

            embed.set_footer(
                text=f"Action by: {ctx.author}",
                icon_url=ctx.author.display_avatar.url,
            )

            await ctx.send(embed=embed)

        # cleanup
        try:
            await ctx.message.delete()

        except discord.HTTPException:
            pass

    @banner.error
    async def banner_error(self, ctx: commands.Context, error):

        if isinstance(error, commands.CommandOnCooldown):

            await ctx.reply(
                embed=make_embed(
                    title="Cooldown",
                    description=
                    f"Try again in **{round(error.retry_after, 1)}s**.",
                    level="WARNING",
                ),
                mention_author=False,
            )


async def setup(bot: commands.Bot):
    await bot.add_cog(Banner(bot))
