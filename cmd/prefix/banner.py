import discord
from discord.ext import commands

from utils.emojis import EMOJIS


# ─────────────────────────────────────
# BANNER BUTTON VIEW
# ─────────────────────────────────────
class BannerView(discord.ui.View):

    def __init__(
        self,
        *,
        global_url: str | None,
        server_url: str | None,
    ):
        super().__init__(timeout=60)

        if global_url:
            self.add_item(
                discord.ui.Button(
                    label="Global Banner",
                    style=discord.ButtonStyle.link,
                    url=global_url,
                ))

        if server_url:
            self.add_item(
                discord.ui.Button(
                    label="Server Banner",
                    style=discord.ButtonStyle.link,
                    url=server_url,
                ))


# ─────────────────────────────────────
# BANNER COMMAND (PREFIX ONLY)
# ─────────────────────────────────────
class Banner(commands.Cog):

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @commands.command(
        name="banner",
        help="Show the banner of a user",
    )
    async def banner(
        self,
        ctx: commands.Context,
        user: discord.Member | discord.User | None = None,
    ):
        if ctx.guild is None:
            return

        target = user or ctx.author

        # Fetch full user (required for banner access)
        try:
            fetched_user = await self.bot.fetch_user(target.id)
        except discord.NotFound:
            return

        # Resolve member for server banner
        member: discord.Member | None
        if isinstance(target, discord.Member):
            member = target
        else:
            member = ctx.guild.get_member(target.id)

        global_banner = fetched_user.banner.url if fetched_user.banner else None
        server_banner = (member.guild_banner.url
                         if member and member.guild_banner else None)

        # ── No banner at all
        if not global_banner and not server_banner:
            await ctx.send(embed=discord.Embed(
                title=f"{EMOJIS['red_dot']} Banner",
                description=
                (f"{EMOJIS['red_dot']} {target.mention} bhai garibi se bahar aao.\n"
                 f"{EMOJIS['arrow_point']} Nitro lo, fir banner lagao."),
                color=discord.Color.orange(),
            ))
            await self._cleanup(ctx)
            return

        # ── Embed
        embed = discord.Embed(
            title=f"{EMOJIS['enjoy']} Banner",
            description=(
                f"{EMOJIS['okay']} Ruk ja bhai, dikha raha hoon.\n"
                f"{EMOJIS['arrow_point']} Ye raha {target.mention} ka banner 👇"
            ),
            color=discord.Color.blurple(),
        )

        # Prefer server banner
        if server_banner:
            embed.set_image(url=server_banner)
        else:
            embed.set_image(url=global_banner)

        embed.set_footer(text=f"Requested by {ctx.author}")

        view = BannerView(
            global_url=global_banner,
            server_url=server_banner,
        )

        await ctx.send(embed=embed, view=view)
        await self._cleanup(ctx)

    # ─────────────────────────────
    # CLEANUP
    # ─────────────────────────────
    async def _cleanup(self, ctx: commands.Context) -> None:
        try:
            await ctx.message.delete()
        except (discord.Forbidden, discord.NotFound):
            pass


async def setup(bot: commands.Bot):
    await bot.add_cog(Banner(bot))
