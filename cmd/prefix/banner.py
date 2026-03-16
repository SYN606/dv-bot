import discord
from discord.ext import commands

from utils.embeds import make_embed
from utils.views.base_media_view import BaseMediaView


class Banner(commands.Cog):
    """
    Prefix banner command.
    Displays a user's banner (global or server-specific).
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

        # Resolve guild member safely
        member = ctx.guild.get_member(target.id)

        # Fetch full user (global banner requires API fetch)
        fetched_user = await self.bot.fetch_user(target.id)

        global_banner = (fetched_user.banner.url
                         if fetched_user.banner else None)

        server_banner = (member.guild_banner.url
                         if member and member.guild_banner else None)

        # ─────────────────────────
        # No banners at all
        # ─────────────────────────
        if not global_banner and not server_banner:

            embed = make_embed(
                title="User Banner",
                description=
                f"{target.mention} does not have a banner configured.",
                level="WARNING",
                footer=f"Requested by {ctx.author}",
            )

            await ctx.send(embed=embed)
            return

        # ─────────────────────────
        # If both banners exist → show toggle view
        # ─────────────────────────
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

        else:

            embed = make_embed(
                title="User Banner",
                description=f"Banner for {target.mention}.",
                level="INFO",
                footer=f"Requested by {ctx.author}",
            )

            embed.set_image(url=server_banner or global_banner)

            await ctx.send(embed=embed)

        # Delete invoking message silently
        try:
            ctx.bot.loop.create_task(ctx.message.delete())
        except Exception:
            pass


async def setup(bot: commands.Bot):
    await bot.add_cog(Banner(bot))
