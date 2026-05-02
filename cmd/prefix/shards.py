import time
import discord
from discord.ext import commands
from typing import Optional
import os
import psutil

from utils.core.embeds import make_embed
from utils.core.emojis import EMOJIS

START_TIME = time.time()
_global_last_used: dict[int, float] = {}
GLOBAL_COOLDOWN = 3


def format_uptime(seconds: int) -> str:
    d, seconds = divmod(seconds, 86400)
    h, seconds = divmod(seconds, 3600)
    m, s = divmod(seconds, 60)

    parts = []
    if d:
        parts.append(f"{d}d")
    if h:
        parts.append(f"{h}h")
    if m:
        parts.append(f"{m}m")
    if s:
        parts.append(f"{s}s")

    return " ".join(parts) or "0s"


class ShardView(discord.ui.View):

    def __init__(self, cog, author_id: int):
        super().__init__(timeout=60)
        self.cog = cog
        self.author_id = author_id

    async def interaction_check(self,
                                interaction: discord.Interaction) -> bool:
        if interaction.user.id != self.author_id:
            await interaction.response.send_message(
                embed=make_embed(
                    title="Access Denied",
                    description="You cannot use this.",
                    level="ERROR",
                ),
                ephemeral=True,
            )
            return False
        return True

    @discord.ui.button(label="Refresh",
                       emoji="🔄",
                       style=discord.ButtonStyle.secondary)
    async def refresh(self, interaction: discord.Interaction, _):
        embed = await self.cog.build_embed(interaction.guild)
        await interaction.response.edit_message(embed=embed, view=self)


class Shards(commands.Cog):

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    async def build_embed(self, guild: discord.Guild):

        now = int(time.time())
        uptime = format_uptime(int(now - START_TIME))

        latency = round(self.bot.latency * 1000)
        guilds = len(self.bot.guilds)
        users = sum((g.member_count or 0) for g in self.bot.guilds)

        shard_id = getattr(guild, "shard_id", 0) or 0
        shard_count = getattr(self.bot, "shard_count", 1) or 1

        shard_latency: Optional[int] = None
        try:
            shard = self.bot.get_shard(shard_id)  # type: ignore
            if shard:
                shard_latency = round(shard.latency * 1000)
        except Exception:
            pass

        if latency < 120:
            status = EMOJIS["green_dot"]
        elif latency < 250:
            status = EMOJIS["warning"]
        else:
            status = EMOJIS["fail"]

        ram = "N/A"
        cpu = "N/A"

        try:
            process = psutil.Process(os.getpid())
            ram = f"{process.memory_info().rss / 1024**2:.1f} MB"
            cpu = f"{psutil.cpu_percent()}%"
        except Exception:
            pass

        fields = [
            ("Latency", f"{status} `{latency} ms`", True),
            ("Uptime", f"`{uptime}`", True),
            ("Guilds", f"`{guilds}`", True),
            ("Users", f"`{users}`", True),
            ("Shard", f"`{shard_id + 1}/{shard_count}`", True),
            ("RAM", f"`{ram}`", True),
            ("CPU", f"`{cpu}`", True),
        ]

        if shard_latency is not None:
            fields.append(("Shard Latency", f"`{shard_latency} ms`", True))

        bot_name = self.bot.user.name if self.bot.user else "Bot"

        return make_embed(
            title=f"{bot_name} • System",
            description="Live diagnostics",
            level="INFO",
            fields=fields,
            footer=f"{bot_name} Monitoring",
            use_emoji=True,
        )

    @commands.command(name="shards")
    @commands.guild_only()
    @commands.cooldown(1, 5, commands.BucketType.user)
    async def shards(self, ctx: commands.Context):

        guild_id = ctx.guild.id if ctx.guild else 0
        now = time.time()
        last = _global_last_used.get(guild_id, 0)
        remaining = GLOBAL_COOLDOWN - (now - last)

        if remaining > 0:
            await ctx.reply(
                embed=make_embed(
                    title="Cooldown",
                    description=f"Try again in `{remaining:.1f}s`",
                    level="WARNING",
                ),
                mention_author=False,
            )
            return

        _global_last_used[guild_id] = now

        embed = await self.build_embed(ctx.guild)  # type: ignore
        view = ShardView(self, ctx.author.id)

        await ctx.send(embed=embed, view=view)

        try:
            await ctx.message.delete()
        except discord.HTTPException:
            pass

    @shards.error
    async def shards_error(self, ctx, error):

        if isinstance(error, commands.CommandOnCooldown):
            await ctx.reply(
                embed=make_embed(
                    title="Cooldown",
                    description=f"Try again in `{round(error.retry_after,1)}s`",
                    level="WARNING",
                ),
                mention_author=False,
            )

        else:
            await ctx.reply(
                embed=make_embed(
                    title="Error",
                    description="Something went wrong.",
                    level="ERROR",
                ),
                mention_author=False,
            )


async def setup(bot: commands.Bot):
    await bot.add_cog(Shards(bot))
