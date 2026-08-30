from __future__ import annotations

import discord
from discord import app_commands
from discord.ext import commands

from db.db_helpers.analytics import get_peak_hours, get_server_retention_stats
from utils.core.embeds import make_embed
from utils.core.emojis import EMOJIS


class StatsCommands(commands.Cog):
    """Public commands for displaying overall server analytics and peak activity times."""

    def __init__(self, bot: commands.Bot) -> None:
        self.bot = bot

    @app_commands.command(
        name="serverstats",
        description="View overall server analytics and growth metrics.",
    )
    async def server_stats_slash(self,
                                 interaction: discord.Interaction) -> None:
        if not interaction.guild:
            return
        await interaction.response.defer()
        embed = await self._generate_server_stats_embed(interaction.guild)
        await interaction.followup.send(embed=embed)

    @commands.command(
        name="serverstats",
        help="View overall server analytics and growth metrics.",
    )
    async def server_stats_prefix(self, ctx: commands.Context) -> None:
        if not ctx.guild:
            return
        embed = await self._generate_server_stats_embed(ctx.guild)
        await ctx.send(embed=embed)

    async def _generate_server_stats_embed(
            self, guild: discord.Guild) -> discord.Embed:
        from datetime import datetime, timedelta, timezone

        since_date = datetime.now(timezone.utc) - timedelta(days=30)
        stats = await get_server_retention_stats(guild.id,
                                                 since_date=since_date)

        arrow = EMOJIS.get("arrow_point", "•")
        member_emoji = EMOJIS.get("member", "👥")
        announcement_emoji = EMOJIS.get("announcement", "📢")

        fields = [
            (
                f"{member_emoji} Total Active Members",
                f"**{int(stats['total_active']):,}**",
                True,
            ),
            (
                f"{announcement_emoji} 30d Joins / Leaves",
                f"**+{int(stats['total_joins']):,}** / **-{int(stats['total_leaves']):,}**",
                True,
            ),
            (
                "📈 30d Net Growth",
                f"**{'+' if stats['net_growth'] >= 0 else ''}{int(stats['net_growth']):,}**",
                True,
            ),
            (
                "🔒 30d Retention Rate",
                f"**{stats['retention_rate']:.1f}%**",
                True,
            ),
        ]

        return make_embed(
            title=f"Analytics Overview — {guild.name}",
            description=
            f"{arrow} Detailed 30-day performance and activity breakdown for this guild.",
            level="INFO",
            fields=fields,
            show_timestamp=True,
            use_emoji=True,
        )

    @app_commands.command(
        name="peakactivity",
        description="Check peak server activity hours and days.",
    )
    async def peak_activity_slash(self,
                                  interaction: discord.Interaction) -> None:
        if not interaction.guild:
            return
        await interaction.response.defer()
        embed = await self._generate_peak_activity_embed(interaction.guild)
        await interaction.followup.send(embed=embed)

    @commands.command(
        name="peakactivity",
        help="Check peak server activity hours and days.",
    )
    async def peak_activity_prefix(self, ctx: commands.Context) -> None:
        if not ctx.guild:
            return
        embed = await self._generate_peak_activity_embed(ctx.guild)
        await ctx.send(embed=embed)

    async def _generate_peak_activity_embed(
            self, guild: discord.Guild) -> discord.Embed:
        top_hours = await get_peak_hours(guild.id, limit=3)
        days = [
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
            "Sunday",
        ]
        arrow = EMOJIS.get("curved_arrow", "↳")

        if top_hours:
            lines = [
                f"{arrow} **{days[h.day_of_week]}** at **{h.hour_of_day:02d}:00 UTC** — `{h.message_count:,}` messages"
                for h in top_hours
            ]
            description = "\n".join(lines)
        else:
            description = "No activity records accumulated yet."

        return make_embed(
            title=f"Peak Activity Hours — {guild.name}",
            description=description,
            level="INFO",
            show_timestamp=True,
            use_emoji=True,
        )


async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(StatsCommands(bot))
