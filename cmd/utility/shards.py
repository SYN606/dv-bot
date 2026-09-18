from __future__ import annotations

import logging
import os
import time
from typing import Optional

import discord
import psutil
from discord.ext import commands

from utils.core.embeds import make_embed
from utils.core.emojis import EMOJIS

logger = logging.getLogger("DigitalVigil")

START_TIME: float = time.time()

_global_last_used: dict[int, float] = {}
GLOBAL_COOLDOWN: int = 3


def format_uptime(seconds: int) -> str:
    """Format total seconds into a human-readable string."""
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
    """View containing interactive buttons for refreshing stats and inspecting shards."""

    def __init__(self, cog: Shards, author_id: int):
        super().__init__(timeout=60)
        self.cog = cog
        self.author_id = author_id
        self.message: Optional[discord.Message] = None
        self._cooldowns: dict[int, float] = {}
        self.COOLDOWN = 5

    async def interaction_check(self,
                                interaction: discord.Interaction) -> bool:
        """Ensure only the command author can interact with the components."""
        if interaction.user.id != self.author_id:
            await interaction.response.send_message(
                embed=make_embed(
                    title="Access Denied",
                    description=
                    f"{EMOJIS.get('fail', '❌')} You cannot use this interaction.",
                    level="ERROR",
                ),
                ephemeral=True,
            )
            return False
        return True

    def _check_cd(self, user_id: int) -> float:
        """Check button usage cooldown per user."""
        now = time.time()
        last = self._cooldowns.get(user_id, 0.0)
        remaining = self.COOLDOWN - (now - last)

        if remaining > 0:
            return remaining
        self._cooldowns[user_id] = now
        return 0.0

    @discord.ui.button(
        label="Refresh",
        emoji=EMOJIS.get("loading", "🔄"),
        style=discord.ButtonStyle.secondary,
    )
    async def refresh(self, interaction: discord.Interaction,
                      button: discord.ui.Button) -> None:
        """Refresh current system diagnostics embed."""
        remaining = self._check_cd(interaction.user.id)
        if remaining > 0:
            await interaction.response.send_message(
                embed=make_embed(
                    title="Cooldown",
                    description=
                    f"{EMOJIS.get('warning', '⚠️')} Wait `{remaining:.1f}s` before refreshing.",
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
        await interaction.response.edit_message(embed=embed, view=self)

    @discord.ui.button(
        label="Shards",
        emoji=EMOJIS.get("folder", "📁"),
        style=discord.ButtonStyle.secondary,
    )
    async def shard_details(self, interaction: discord.Interaction,
                            button: discord.ui.Button) -> None:
        """Provide detailed metric breakdowns per shard."""
        remaining = self._check_cd(interaction.user.id)
        if remaining > 0:
            await interaction.response.send_message(
                embed=make_embed(
                    title="Cooldown",
                    description=
                    f"{EMOJIS.get('warning', '⚠️')} Wait `{remaining:.1f}s` before using this again.",
                    level="WARNING",
                ),
                ephemeral=True,
            )
            return

        bot = self.cog.bot
        shard_count = getattr(bot, "shard_count", None) or 1
        shards = getattr(bot, "shards", {})

        if shard_count > 1 and shards:
            shard_items = list(shards.items())
        else:
            shard_items = [(0, bot)]

        lines = []
        for shard_id, shard in shard_items:
            latency = round(getattr(shard, "latency", bot.latency) * 1000)
            guilds = sum(1 for g in bot.guilds
                         if getattr(g, "shard_id", 0) == shard_id)

            if latency < 120:
                status = EMOJIS.get("green_dot", "🟢")
            elif latency < 250:
                status = EMOJIS.get("warning", "🟡")
            else:
                status = EMOJIS.get("fail", "🔴")

            lines.append(
                f"{status} Shard `{shard_id}` • `{latency}ms` • `{guilds}` guilds"
            )

        embed = make_embed(
            title=f"{EMOJIS.get('folder', '📁')} Shard Information",
            description="\n".join(lines) or "No shard data available.",
            level="INFO",
        )
        embed.timestamp = discord.utils.utcnow()
        embed.set_footer(
            text=f"Action by: {interaction.user}",
            icon_url=interaction.user.display_avatar.url,
        )
        await interaction.response.send_message(embed=embed, ephemeral=True)

    async def on_timeout(self) -> None:
        """Disable all components upon timeout."""
        for item in self.children:
            if isinstance(item, (discord.ui.Button, discord.ui.Select)):
                item.disabled = True
        if self.message:
            try:
                await self.message.edit(view=self)
            except (discord.HTTPException, discord.NotFound):
                pass


class Shards(commands.Cog):
    """Cog for presenting bot telemetry, shard statuses, and host system health."""

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    async def _cleanup_invocation(self, ctx: commands.Context) -> None:
        """Safely delete original invocation message for prefix commands."""
        if ctx.interaction:
            return
        try:
            if ctx.message:
                await ctx.message.delete()
        except (discord.Forbidden, discord.NotFound, discord.HTTPException):
            pass

    async def build_embed(
        self,
        guild: discord.Guild,
        requester: discord.abc.User,
    ) -> discord.Embed:
        """Construct diagnostic statistics embed."""
        now = int(time.time())
        uptime = format_uptime(int(now - START_TIME))
        latency = round(self.bot.latency * 1000)
        guilds = len(self.bot.guilds)
        users = sum((g.member_count or 0) for g in self.bot.guilds)
        shard_id = getattr(guild, "shard_id", 0) or 0
        shard_count = getattr(self.bot, "shard_count", 1) or 1

        if latency < 120:
            status = EMOJIS.get("green_dot", "🟢")
        elif latency < 250:
            status = EMOJIS.get("warning", "🟡")
        else:
            status = EMOJIS.get("fail", "🔴")

        ram = "N/A"
        cpu = "N/A"

        try:
            process = psutil.Process(os.getpid())
            ram = f"{process.memory_info().rss / 1024**2:.1f} MB"
            cpu = f"{psutil.cpu_percent()}%"
        except Exception:
            pass

        fields = [
            (
                f"{EMOJIS.get('ping', '📡')} Latency",
                f"{status} `{latency}ms`",
                True,
            ),
            (
                f"{EMOJIS.get('folder', '📁')} Shard",
                f"`{shard_id + 1}/{shard_count}`",
                True,
            ),
            (
                f"{EMOJIS.get('loading', '⏳')} Uptime",
                f"`{uptime}`",
                True,
            ),
            (
                f"{EMOJIS.get('moderation', '🛡️')} Guilds",
                f"`{guilds}`",
                True,
            ),
            (
                f"{EMOJIS.get('developer', '👤')} Users",
                f"`{users:,}`",
                True,
            ),
            (
                f"{EMOJIS.get('support_dot', '🔹')} RAM",
                f"`{ram}`",
                True,
            ),
            (
                f"{EMOJIS.get('support_dot', '🔹')} CPU",
                f"`{cpu}`",
                True,
            ),
        ]

        bot_name = self.bot.user.name if self.bot.user else "Bot"
        embed = make_embed(
            title=f"{EMOJIS.get('developer', '⚙️')} {bot_name} Diagnostics",
            description=
            f"{EMOJIS.get('green_dot', '🟢')} Live monitoring and performance stats.",
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

    @commands.hybrid_command(
        name="shards",
        aliases=["shardinfo", "botstats", "diagnostics"],
        description="Display real-time shard metrics and system diagnostics.",
    )
    @commands.guild_only()
    @commands.cooldown(1, 5, commands.BucketType.user)
    async def shards(self, ctx: commands.Context) -> None:
        """Command handler for displaying shard and system metrics."""
        guild = ctx.guild
        if guild is None:
            return

        guild_id = guild.id
        now = time.time()
        last = _global_last_used.get(guild_id, 0.0)

        remaining = GLOBAL_COOLDOWN - (now - last)
        if remaining > 0:
            embed = make_embed(
                title="Cooldown",
                description=
                f"{EMOJIS.get('warning', '⚠️')} Try again in `{remaining:.1f}s`",
                level="WARNING",
            )
            if ctx.interaction:
                await ctx.interaction.response.send_message(embed=embed,
                                                            ephemeral=True)
            else:
                await ctx.reply(embed=embed, mention_author=False)
            return

        _global_last_used[guild_id] = now
        embed = await self.build_embed(guild=guild, requester=ctx.author)
        view = ShardView(cog=self, author_id=ctx.author.id)

        if ctx.interaction:
            await ctx.interaction.response.send_message(embed=embed, view=view)
            msg = await ctx.interaction.original_response()
        else:
            msg = await ctx.send(embed=embed, view=view)

        view.message = msg
        await self._cleanup_invocation(ctx)

    @shards.error
    async def shards_error(self, ctx: commands.Context,
                           error: commands.CommandError) -> None:
        """Handle execution errors specific to the shards command."""
        if isinstance(error, commands.CommandOnCooldown):
            embed = make_embed(
                title="Cooldown",
                description=
                f"{EMOJIS.get('warning', '⚠️')} Try again in `{round(error.retry_after, 1)}s`",
                level="WARNING",
            )
            if ctx.interaction:
                if ctx.interaction.response.is_done():
                    await ctx.interaction.followup.send(embed=embed,
                                                        ephemeral=True)
                else:
                    await ctx.interaction.response.send_message(embed=embed,
                                                                ephemeral=True)
            else:
                await ctx.reply(embed=embed, mention_author=False)
            return

        logger.exception("Unhandled error in shards command:", exc_info=error)
        embed = make_embed(
            title="Error",
            description=
            f"{EMOJIS.get('fail', '❌')} Something went wrong while running diagnostics.",
            level="ERROR",
        )
        if ctx.interaction:
            if ctx.interaction.response.is_done():
                await ctx.interaction.followup.send(embed=embed,
                                                    ephemeral=True)
            else:
                await ctx.interaction.response.send_message(embed=embed,
                                                            ephemeral=True)
        else:
            await ctx.reply(embed=embed, mention_author=False)


async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(Shards(bot))
