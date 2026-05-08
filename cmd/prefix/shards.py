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
                    description=
                    f"{EMOJIS['fail']} You cannot use this interaction.",
                    level="ERROR",
                ),
                ephemeral=True,
            )

            return False

        return True

    def _check_cd(self, user_id: int) -> float:

        now = time.time()

        last = self._cooldowns.get(user_id, 0)

        remaining = self.COOLDOWN - (now - last)

        if remaining > 0:
            return remaining

        self._cooldowns[user_id] = now

        return 0

    @discord.ui.button(
        label="Refresh",
        emoji="🔄",
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
                    description=
                    f"{EMOJIS['warning']} Wait `{remaining:.1f}s` before refreshing.",
                    level="WARNING",
                ),
                ephemeral=True,
            )

            return

        embed = await self.cog.build_embed(
            guild=interaction.guild,
            requester=interaction.user,
        )

        await interaction.response.edit_message(
            embed=embed,
            view=self,
        )

    @discord.ui.button(
        label="Shards",
        emoji="🧩",
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
                    description=
                    f"{EMOJIS['warning']} Wait `{remaining:.1f}s` before using this again.",
                    level="WARNING",
                ),
                ephemeral=True,
            )

            return

        lines = []

        for shard_id, shard in self.cog.bot.shards.items():

            latency = round(shard.latency * 1000)

            guilds = sum(1 for g in self.cog.bot.guilds
                         if g.shard_id == shard_id)

            status = (EMOJIS["green_dot"] if latency < 120 else
                      EMOJIS["warning"] if latency < 250 else EMOJIS["fail"])

            lines.append(f"{status} Shard `{shard_id}` "
                         f"• `{latency} ms` "
                         f"• `{guilds}` guilds")

        embed = make_embed(
            title="🧩 Shard Information",
            description="\n".join(lines) or "No shard data available.",
            level="INFO",
        )

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

    def __init__(self, bot: commands.Bot):
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

            cpu = f"{psutil.cpu_percent()}%"

        except Exception:
            pass

        fields = [
            (
                "Latency",
                f"{status} `{latency} ms`",
                True,
            ),
            (
                "Shard",
                f"`{shard_id + 1}/{shard_count}`",
                True,
            ),
            (
                "Shard Latency",
                f"`{shard_latency or latency} ms`",
                True,
            ),
            (
                "Guilds",
                f"`{guilds}`",
                True,
            ),
            (
                "Users",
                f"`{users}`",
                True,
            ),
            (
                "RAM Usage",
                f"`{ram}`",
                True,
            ),
            (
                "CPU Usage",
                f"`{cpu}`",
                True,
            ),
            (
                "Uptime",
                f"`{uptime}`",
                True,
            ),
        ]

        bot_name = (self.bot.user.name if self.bot.user else "Bot")

        embed = make_embed(
            title=f"{bot_name} • System Diagnostics",
            description=(f"{EMOJIS['green_dot']} "
                         f"Live monitoring and shard diagnostics."),
            level="INFO",
            fields=fields,
            use_emoji=True,
        )

        if self.bot.user:

            embed.set_thumbnail(url=self.bot.user.display_avatar.url)

        embed.set_footer(
            text=f"Action by: {requester}",
            icon_url=requester.display_avatar.url,
        )

        return embed

    @commands.command(
        name="shards",
        aliases=["shardinfo"],
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

        guild_id = ctx.guild.id if ctx.guild else 0

        now = time.time()

        last = _global_last_used.get(
            guild_id,
            0,
        )

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

        embed = await self.build_embed(
            guild=ctx.guild,  # type: ignore
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
        ctx,
        error,
    ):

        if isinstance(
                error,
                commands.CommandOnCooldown,
        ):

            await ctx.reply(
                embed=make_embed(
                    title="Cooldown",
                    description=(f"Try again in "
                                 f"`{round(error.retry_after, 1)}s`"),
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
