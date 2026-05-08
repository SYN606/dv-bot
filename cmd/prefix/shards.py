from asyncio.log import logger
import os
import time
from typing import Optional
import discord
import psutil
from discord.ext import commands
from utils.core.embeds import make_embed
from utils.core.emojis import EMOJIS

START_TIME = time.time()

_global_last_used: dict[int, float] = {}
GLOBAL_COOLDOWN = 3


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


class ShardView(discord.ui.View):

    def __init__(
        self,
        cog,
        author_id: int,
    ):

        super().__init__(timeout=60)
        self.cog = cog
        self.author_id = author_id
        self._cooldowns: dict[int, float] = {}
        self.COOLDOWN = 5

    async def interaction_check(
        self,
        interaction: discord.Interaction,
    ) -> bool:
        if interaction.user.id != self.author_id:
            await interaction.response.send_message(
                embed=make_embed(
                    title="Access Denied",
                    description=(f"{EMOJIS['fail']} "
                                 f"You cannot use this interaction."),
                    level="ERROR",
                ),
                ephemeral=True,
            )
            return False
        return True

    def _check_cd(
        self,
        user_id: int,
    ) -> float:

        now = time.time()
        last = self._cooldowns.get(user_id, 0)
        remaining = self.COOLDOWN - (now - last)

        if remaining > 0:
            return remaining
        self._cooldowns[user_id] = now
        return 0

    @discord.ui.button(
        label="Refresh",
        emoji=EMOJIS["rounded_loading"],
        style=discord.ButtonStyle.secondary,
    )
    async def refresh(
        self,
        interaction: discord.Interaction,
        _,
    ):

        remaining = self._check_cd(interaction.user.id)
        if remaining > 0:
            await interaction.response.send_message(
                embed=make_embed(
                    title="Cooldown",
                    description=(
                        f"{EMOJIS['warning']} "
                        f"Wait `{remaining:.1f}s` before refreshing."),
                    level="WARNING",
                ),
                ephemeral=True,
            )
            return

        guild = interaction.guild
        if guild is None:
            return

        embed = await self.cog.build_embed(
            guild=guild,
            requester=interaction.user,
        )
        await interaction.response.edit_message(
            embed=embed,
            view=self,
        )

    @discord.ui.button(
        label="Shards",
        emoji=EMOJIS["folder"],
        style=discord.ButtonStyle.secondary,
    )
    async def shard_details(
        self,
        interaction: discord.Interaction,
        _,
    ):

        remaining = self._check_cd(interaction.user.id)
        if remaining > 0:

            await interaction.response.send_message(
                embed=make_embed(
                    title="Cooldown",
                    description=(
                        f"{EMOJIS['warning']} "
                        f"Wait `{remaining:.1f}s` before using this again."),
                    level="WARNING",
                ),
                ephemeral=True,
            )

            return

        if self.cog.bot.shard_count:
            shard_items = self.cog.bot.shards.items()
        else:
            shard_items = [(0, self.cog.bot)]

        lines = []

        for shard_id, shard in shard_items:
            latency = round(shard.latency * 1000)
            guilds = sum(1 for g in self.cog.bot.guilds
                         if g.shard_id == shard_id)

            if latency < 120:
                status = EMOJIS["green_dot"]
            elif latency < 250:
                status = EMOJIS["warning"]
            else:
                status = EMOJIS["fail"]
            lines.append(f"{status} "
                         f"Shard `{shard_id}` • "
                         f"`{latency}ms` • "
                         f"`{guilds}` guilds")

        embed = make_embed(
            title=(f"{EMOJIS['folder']} "
                   f"Shard Information"),
            description=("\n".join(lines) or "No shard data available."),
            level="INFO",
        )
        embed.timestamp = discord.utils.utcnow()
        embed.set_footer(
            text=f"Action by: {interaction.user}",
            icon_url=interaction.user.display_avatar.url,
        )
        await interaction.response.send_message(
            embed=embed,
            ephemeral=True,
        )

    async def on_timeout(self):

        for item in self.children:
            item.disabled = True  # type: ignore


class Shards(commands.Cog):

    def __init__(
        self,
        bot: commands.Bot,
    ):
        self.bot = bot

    async def build_embed(
        self,
        guild: discord.Guild,
        requester: discord.abc.User,
    ):
        now = int(time.time())
        uptime = format_uptime(int(now - START_TIME))
        latency = round(self.bot.latency * 1000)
        guilds = len(self.bot.guilds)
        users = sum((g.member_count or 0) for g in self.bot.guilds)
        shard_id = getattr(
            guild,
            "shard_id",
            0,
        ) or 0

        shard_count = getattr(
            self.bot,
            "shard_count",
            1,
        ) or 1
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

            ram = (f"{process.memory_info().rss / 1024**2:.1f} MB")

            cpu = (f"{psutil.cpu_percent()}%")

        except Exception:
            pass

        fields = [
            (
                f"{EMOJIS['ping']} Latency",
                f"{status} `{latency}ms`",
                True,
            ),
            (
                f"{EMOJIS['folder']} Shard",
                f"`{shard_id + 1}/{shard_count}`",
                True,
            ),
            (
                f"{EMOJIS['loading']} Uptime",
                f"`{uptime}`",
                True,
            ),
            (
                f"{EMOJIS['moderation']} Guilds",
                f"`{guilds}`",
                True,
            ),
            (
                f"{EMOJIS['developer']} Users",
                f"`{users}`",
                True,
            ),
            (
                f"{EMOJIS['support_dot']} RAM",
                f"`{ram}`",
                True,
            ),
            (
                f"{EMOJIS['support_dot']} CPU",
                f"`{cpu}`",
                True,
            ),
        ]

        bot_name = (self.bot.user.name if self.bot.user else "Bot")
        embed = make_embed(
            title=(f"{EMOJIS['developer']} "
                   f"{bot_name} Diagnostics"),
            description=(f"{EMOJIS['green_dot']} "
                         f"Live monitoring and performance stats."),
            level="INFO",
            fields=fields,
            use_emoji=True,
        )

        if self.bot.user:

            embed.set_thumbnail(url=self.bot.user.display_avatar.url)
        embed.timestamp = discord.utils.utcnow()
        embed.set_footer(
            text=f"Action by: {requester}",
            icon_url=requester.display_avatar.url,
        )
        return embed

    @commands.command(
        name="shards",
        aliases=[
            "shardinfo",
            "botstats",
            "diagnostics",
        ],
        help="Display shard and system diagnostics",
    )
    @commands.guild_only()
    @commands.cooldown(
        1,
        5,
        commands.BucketType.user,
    )
    async def shards(
        self,
        ctx: commands.Context,
    ):
        guild = ctx.guild
        if guild is None:
            return
        guild_id = guild.id
        now = time.time()
        last = _global_last_used.get(
            guild_id,
            0,
        )

        remaining = (GLOBAL_COOLDOWN - (now - last))
        if remaining > 0:
            await ctx.reply(
                embed=make_embed(
                    title="Cooldown",
                    description=(f"{EMOJIS['warning']} "
                                 f"Try again in "
                                 f"`{remaining:.1f}s`"),
                    level="WARNING",
                ),
                mention_author=False,
            )
            return
        _global_last_used[guild_id] = now
        embed = await self.build_embed(
            guild=guild,
            requester=ctx.author,
        )
        view = ShardView(
            cog=self,
            author_id=ctx.author.id,
        )
        await ctx.send(
            embed=embed,
            view=view,
        )
        try:
            await ctx.message.delete()
        except discord.HTTPException:
            pass

    @shards.error
    async def shards_error(
        self,
        ctx: commands.Context,
        error: commands.CommandError,
    ):
        if isinstance(
                error,
                commands.CommandOnCooldown,
        ):
            await ctx.reply(
                embed=make_embed(
                    title="Cooldown",
                    description=(f"{EMOJIS['warning']} "
                                 f"Try again in "
                                 f"`{round(error.retry_after, 1)}s`"),
                    level="WARNING",
                ),
                mention_author=False,
            )
            return
        logger.exception(error)
        await ctx.reply(
            embed=make_embed(
                title="Error",
                description=(f"{EMOJIS['fail']} "
                             f"Something went wrong."),
                level="ERROR",
            ),
            mention_author=False,
        )


async def setup(bot: commands.Bot):
    await bot.add_cog(Shards(bot))
