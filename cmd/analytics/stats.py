from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional, Union

import discord
from discord import app_commands
from discord.ext import commands

from db.db_helpers.analytics import get_peak_hours, get_server_retention_stats
from utils.core.embeds import make_embed
from utils.core.emojis import EMOJIS


class TimeframeSelect(discord.ui.Select):
    """Dropdown component for switching analytics timeframes."""

    def __init__(self, author_id: int, current_days: int = 7) -> None:
        self.author_id = author_id
        options = [
            discord.SelectOption(
                label="7 Days (Weekly)",
                value="7",
                description="View stats for the last 7 days",
                default=(current_days == 7),
                emoji="📅",
            ),
            discord.SelectOption(
                label="14 Days (Fortnightly)",
                value="14",
                description="View stats for the last 14 days",
                default=(current_days == 14),
                emoji="📆",
            ),
            discord.SelectOption(
                label="30 Days (Monthly)",
                value="30",
                description="View stats for the last 30 days",
                default=(current_days == 30),
                emoji="📊",
            ),
        ]
        super().__init__(
            placeholder="📅 Choose Timeframe...",
            min_values=1,
            max_values=1,
            options=options,
        )

    async def callback(self, interaction: discord.Interaction) -> None:
        if interaction.user.id != self.author_id:
            await interaction.response.send_message(
                f"{EMOJIS.get('fail', '❌')} You cannot control this menu.",
                ephemeral=True,
            )
            return

        days = int(self.values[0])
        await interaction.response.defer()

        if interaction.guild:
            embed = await StatsCommands.generate_server_stats_embed(
                interaction.guild, days=days)
            view = StatsTimeframeView(self.author_id, current_days=days)
            await interaction.edit_original_response(embed=embed, view=view)


class StatsTimeframeView(discord.ui.View):
    """Interactive view allowing toggles between Weekly, 14-Day, and Monthly metrics."""

    def __init__(
        self,
        author_id: int,
        current_days: int = 7,
        timeout: float = 120.0,
    ) -> None:
        super().__init__(timeout=timeout)
        self.author_id = author_id
        self.current_days = current_days
        self.message: Optional[Union[discord.Message,
                                     discord.InteractionMessage]] = None

        self.add_item(TimeframeSelect(author_id, current_days=current_days))

    @discord.ui.button(label="7d",
                       style=discord.ButtonStyle.primary,
                       emoji="📅")
    async def btn_7d(self, interaction: discord.Interaction,
                     button: discord.ui.Button) -> None:
        await self._handle_button_timeframe(interaction, days=7)

    @discord.ui.button(label="14d",
                       style=discord.ButtonStyle.primary,
                       emoji="📆")
    async def btn_14d(self, interaction: discord.Interaction,
                      button: discord.ui.Button) -> None:
        await self._handle_button_timeframe(interaction, days=14)

    @discord.ui.button(label="30d",
                       style=discord.ButtonStyle.primary,
                       emoji="📊")
    async def btn_30d(self, interaction: discord.Interaction,
                      button: discord.ui.Button) -> None:
        await self._handle_button_timeframe(interaction, days=30)

    async def _handle_button_timeframe(self, interaction: discord.Interaction,
                                       days: int) -> None:
        if interaction.user.id != self.author_id:
            await interaction.response.send_message(
                f"{EMOJIS.get('fail', '❌')} You cannot control this menu.",
                ephemeral=True,
            )
            return

        if self.current_days == days:
            await interaction.response.defer()
            return

        await interaction.response.defer()

        if interaction.guild:
            embed = await StatsCommands.generate_server_stats_embed(
                interaction.guild, days=days)
            view = StatsTimeframeView(self.author_id, current_days=days)
            await interaction.edit_original_response(embed=embed, view=view)

    async def on_timeout(self) -> None:
        for item in self.children:
            if isinstance(item, (discord.ui.Select, discord.ui.Button)):
                item.disabled = True

        if self.message:
            try:
                await self.message.edit(view=self)
            except (discord.NotFound, discord.HTTPException):
                pass


class StatsCommands(commands.Cog):
    """Public commands for displaying overall server analytics and peak activity times."""

    def __init__(self, bot: commands.Bot) -> None:
        self.bot = bot

    @staticmethod
    async def generate_server_stats_embed(guild: discord.Guild,
                                          days: int = 7) -> discord.Embed:
        """Generates dynamic server metrics embed for 7d, 14d, or 30d timeframes."""
        since_date = datetime.now(timezone.utc) - timedelta(days=days)
        stats = await get_server_retention_stats(guild.id,
                                                 since_date=since_date)

        arrow = EMOJIS.get("arrow_point", "•")
        member_emoji = EMOJIS.get("member", "👥")
        announcement_emoji = EMOJIS.get("announcement", "📢")

        label_prefix = f"{days}d"

        fields = [
            (
                f"{member_emoji} Total Active Members",
                f"**{int(stats['total_active']):,}**",
                True,
            ),
            (
                f"{announcement_emoji} {label_prefix} Joins / Leaves",
                f"**+{int(stats['total_joins']):,}** / **-{int(stats['total_leaves']):,}**",
                True,
            ),
            (
                f"📈 {label_prefix} Net Growth",
                f"**{'+' if stats['net_growth'] >= 0 else ''}{int(stats['net_growth']):,}**",
                True,
            ),
            (
                f"🔒 {label_prefix} Retention Rate",
                f"**{stats['retention_rate']:.1f}%**",
                True,
            ),
        ]

        timeframe_label = ("Weekly (7 Days)" if days == 7 else
                           "14 Days" if days == 14 else "Monthly (30 Days)")

        return make_embed(
            title=f"Analytics Overview — {guild.name}",
            description=
            f"{arrow} Detailed **{timeframe_label}** performance and activity breakdown.",
            level="INFO",
            fields=fields,
            show_timestamp=True,
            use_emoji=True,
        )

    @app_commands.command(
        name="serverstats",
        description=
        "View server analytics for weekly, 14-day, or monthly periods.",
    )
    @app_commands.describe(days="Select timeframe window (7, 14, or 30 days)")
    @app_commands.choices(days=[
        app_commands.Choice(name="7 Days (Weekly)", value=7),
        app_commands.Choice(name="14 Days", value=14),
        app_commands.Choice(name="30 Days (Monthly)", value=30),
    ])
    async def server_stats_slash(
        self,
        interaction: discord.Interaction,
        days: Optional[app_commands.Choice[int]] = None,
    ) -> None:
        if not interaction.guild:
            return

        selected_days = days.value if days else 7
        await interaction.response.defer()

        embed = await self.generate_server_stats_embed(interaction.guild,
                                                       days=selected_days)
        view = StatsTimeframeView(author_id=interaction.user.id,
                                  current_days=selected_days)

        await interaction.followup.send(embed=embed, view=view)
        view.message = await interaction.original_response()

    @commands.command(
        name="serverstats",
        help="View server analytics. Usage: !serverstats [7|14|30]",
    )
    async def server_stats_prefix(self,
                                  ctx: commands.Context,
                                  days: Optional[int] = 7) -> None:
        if not ctx.guild:
            return

        # Sanitize timeframe input to valid ranges
        selected_days = days if days in (7, 14, 30) else 7

        embed = await self.generate_server_stats_embed(ctx.guild,
                                                       days=selected_days)
        view = StatsTimeframeView(author_id=ctx.author.id,
                                  current_days=selected_days)

        view.message = await ctx.send(embed=embed, view=view)

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
