from __future__ import annotations

import logging
import time
from typing import Optional, Tuple

import discord
from discord.ext import commands

from utils.core.embeds import make_embed
from utils.views.base_media_view import BaseMediaView

logger = logging.getLogger("DigitalVigital")

_banner_cache: dict[int, tuple[float, str | None]] = {}
CACHE_TTL = 30

_global_last_used: dict[int, float] = {}
GLOBAL_COOLDOWN_DEFAULT = 3
GUILD_COOLDOWNS: dict[int, float] = {}


class Banner(commands.Cog):
    """Cog for displaying user profile banners and server banners."""

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    async def _cleanup_invocation(self, ctx: commands.Context) -> None:
        """Safely delete original text invocation message if applicable."""
        if ctx.interaction:
            return
        try:
            await ctx.message.delete()
        except (discord.Forbidden, discord.NotFound, discord.HTTPException):
            pass

    @commands.hybrid_command(
        name="banner",
        aliases=["userbanner", "serverbanner"],
        description=
        "Display the global/server banner of a user, or the server's banner.",
    )
    @commands.dynamic_cooldown(
        lambda ctx: None if isinstance(ctx.author, discord.Member) and ctx.
        author.guild_permissions.manage_guild else commands.Cooldown(1, 5),
        commands.BucketType.user,
    )
    async def banner(
        self,
        ctx: commands.Context,
        *,
        target: Optional[str] = None,
    ) -> None:
        """Fetch and display user or server banners."""
        guild_id = ctx.guild.id if ctx.guild else 0

        # 1. Global Server Cooldown Lookback
        guild_cd = GUILD_COOLDOWNS.get(guild_id, GLOBAL_COOLDOWN_DEFAULT)
        remaining = guild_cd - (time.time() -
                                _global_last_used.get(guild_id, 0))

        if remaining > 0:
            await ctx.reply(
                embed=make_embed(
                    title="Cooldown Active",
                    description=
                    f"Please wait **{remaining:.1f}s** before running this command again.",
                    level="WARNING",
                ),
                mention_author=False,
                ephemeral=True,
            )
            return

        _global_last_used[guild_id] = time.time()

        # 2. Handle Explicit Server Banner Request
        if target and target.lower() == "server":
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
                text=f"Requested by: {ctx.author}",
                icon_url=ctx.author.display_avatar.url,
            )

            await ctx.send(embed=embed)
            await self._cleanup_invocation(ctx)
            return

        # 3. Resolve Target User
        resolved_user: discord.User | discord.Member = ctx.author
        if target:
            try:
                resolved_user = await commands.UserConverter().convert(
                    ctx, target)
            except commands.UserNotFound:
                await ctx.reply(
                    embed=make_embed(
                        title="User Not Found",
                        description=
                        f"Could not find a user matching `{target}`.",
                        level="ERROR",
                    ),
                    mention_author=False,
                )
                return

        # 4. Fetch Global Banner (With Caching)
        now = time.time()
        cache = _banner_cache.get(resolved_user.id)

        if cache and (now - cache[0] < CACHE_TTL):
            global_banner = cache[1]
        else:
            try:
                fetched_user = await self.bot.fetch_user(resolved_user.id)
                global_banner = fetched_user.banner.url if fetched_user.banner else None
                _banner_cache[resolved_user.id] = (now, global_banner)
            except discord.HTTPException:
                global_banner = None

        # 5. Fetch Guild-Specific Banner (If available)
        member = ctx.guild.get_member(resolved_user.id) if ctx.guild else None
        server_banner = member.guild_banner.url if member and member.guild_banner else None

        # 6. Fallback if no banner exists
        if not global_banner and not server_banner:
            await ctx.reply(
                embed=make_embed(
                    title="No Banner",
                    description=
                    f"{resolved_user.mention} does not have a profile banner.",
                    level="WARNING",
                ),
                mention_author=False,
            )
            return

        # 7. Render Embed / View Response
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
                text=f"Requested by: {ctx.author}",
                icon_url=ctx.author.display_avatar.url,
            )

            message = await ctx.send(embed=embed, view=view)
            view.message = message
        else:
            banner_url = server_banner or global_banner
            embed = make_embed(
                title="User Banner",
                description=resolved_user.mention,
                level="INFO",
            )
            embed.set_image(url=banner_url)
            embed.set_footer(
                text=f"Requested by: {ctx.author}",
                icon_url=ctx.author.display_avatar.url,
            )
            await ctx.send(embed=embed)

        await self._cleanup_invocation(ctx)


async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(Banner(bot))
