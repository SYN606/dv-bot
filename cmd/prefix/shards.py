import time
import discord
from discord.ext import commands
from typing import Optional

from utils.core.embeds import make_embed
from utils.core.emojis import EMOJIS

START_TIME = time.time()


def format_uptime(seconds: int) -> str:
    days, seconds = divmod(seconds, 86400)
    hours, seconds = divmod(seconds, 3600)
    minutes, seconds = divmod(seconds, 60)

    parts = []
    if days:
        parts.append(f"{days}d")
    if hours:
        parts.append(f"{hours}h")
    if minutes:
        parts.append(f"{minutes}m")
    if seconds:
        parts.append(f"{seconds}s")

    return " ".join(parts) or "0s"


# =====================================================
# BUTTON VIEW
# =====================================================
class ShardView(discord.ui.View):

    def __init__(self, bot: commands.Bot):
        super().__init__(timeout=30)
        self.bot = bot

    @discord.ui.button(
        label="Check Ping",
        style=discord.ButtonStyle.primary,
        emoji="🏓",
    )
    async def ping_button(
        self,
        interaction: discord.Interaction,
        button: discord.ui.Button,
    ):
        latency = round(self.bot.latency * 1000)

        if latency < 150:
            status = EMOJIS["green_dot"]
        elif latency < 300:
            status = EMOJIS["warning"]
        else:
            status = EMOJIS["fail"]

        embed = make_embed(
            title="Ping Status",
            description=f"{status} Current latency: `{latency} ms`",
            level="INFO",
            use_emoji=True,
        )

        if interaction.response.is_done():
            await interaction.followup.send(embed=embed, ephemeral=True)
        else:
            await interaction.response.send_message(embed=embed,
                                                    ephemeral=True)


# =====================================================
# COG
# =====================================================
class Shards(commands.Cog):

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    # =====================================================
    # COMMAND (GUILD ONLY)
    # =====================================================
    @commands.command(
        name="shards",
        help="View bot diagnostics and shard status",
    )
    @commands.guild_only()
    @commands.cooldown(1, 10, commands.BucketType.user)
    async def shards(self, ctx: commands.Context) -> None:

        guild = ctx.guild
        if guild is None:
            return

        now = int(time.time())
        uptime = format_uptime(int(now - START_TIME))

        latency = round(self.bot.latency * 1000)
        guilds = len(self.bot.guilds)
        users = sum((g.member_count or 0) for g in self.bot.guilds)

        shard_id = guild.shard_id or 0
        shard_count = self.bot.shard_count or 1

        shard_latency: Optional[int] = None
        if self.bot.shard_count:
            shard = self.bot.get_shard(shard_id) # type: ignore
            if shard:
                shard_latency = round(shard.latency * 1000)

        # STATUS
        if latency < 150:
            status = EMOJIS["green_dot"]
        elif latency < 300:
            status = EMOJIS["warning"]
        else:
            status = EMOJIS["fail"]

        fields = [
            (f"{EMOJIS['ping']} Latency", f"{status} `{latency} ms`", True),
            (f"{EMOJIS['success']} Uptime", f"`{uptime}`", True),
            (f"{EMOJIS['announcement']} Guilds", f"`{guilds}`", True),
            (f"{EMOJIS['message']} Users", f"`{users}`", True),
            (f"{EMOJIS['developer']} Shards",
             f"`{shard_id + 1}/{shard_count}`", True),
        ]

        if shard_latency is not None:
            fields.append((
                f"{EMOJIS['curved_arrow']} Shard Latency",
                f"`{shard_latency} ms`",
                True,
            ))

        embed = make_embed(
            title="Jarvis • System Diagnostics",
            description=("All systems operational. No anomalies detected.\n\n"
                         "*At your service.*"),
            level="INFO",
            fields=fields,
            footer="Developed by SYN",
            use_emoji=True,
        )

        view = ShardView(self.bot)

        await ctx.send(embed=embed, view=view)

    # =====================================================
    # COOLDOWN HANDLER
    # =====================================================
    @shards.error
    async def shards_error(self, ctx: commands.Context,
                           error: commands.CommandError):

        if isinstance(error, commands.CommandOnCooldown):

            embed = make_embed(
                title="Cooldown Active",
                description=
                (f"{EMOJIS['warning']} Slow down.\n"
                 f"{EMOJIS['arrow_point']} Try again in `{round(error.retry_after, 1)}s`"
                 ),
                level="WARNING",
                use_emoji=True,
            )

            try:
                await ctx.send(embed=embed)
            except discord.HTTPException:
                pass


# =====================================================
# SETUP
# =====================================================
async def setup(bot: commands.Bot):
    await bot.add_cog(Shards(bot))
