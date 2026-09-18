from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Optional, Union

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
                interaction.guild, days=days
            )
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
        self.message: Optional[Union[discord.Message, discord.InteractionMessage]] = None

        self.add_item(TimeframeSelect(author_id, current_days=current_days))

    @discord.ui.button(label="7d", style=discord.ButtonStyle.primary, emoji="📅")
    async def btn_7d(self, interaction: discord.Interaction, button: discord.ui.Button) -> None:
        await self._handle_button_timeframe(interaction, days=7)

    @discord.ui.button(label="14d", style=discord.ButtonStyle.primary, emoji="📆")
    async def btn_14d(self, interaction: discord.Interaction, button: discord.ui.Button) -> None:
        await self._handle_button_timeframe(interaction, days=14)

    @discord.ui.button(label="30d", style=discord.ButtonStyle.primary, emoji="📊")
    async def btn_30d(self, interaction: discord.Interaction, button: discord.ui.Button) -> None:
        await self._handle_button_timeframe(interaction, days=30)

    async def _handle_button_timeframe(self, interaction: discord.Interaction, days: int) -> None:
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
                interaction.guild, days=days
            )
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
    """Commands for inspecting overall server analytics and peak activity times."""

    def __init__(self, bot: commands.Bot) -> None:
        self.bot = bot

    @staticmethod
    async def generate_server_stats_embed(guild: discord.Guild, days: int = 7) -> discord.Embed:
        """Generates dynamic server metrics embed for 7d, 14d, or 30d timeframes."""
        since_date = datetime.now(timezone.utc) - timedelta(days=days)
        stats = await get_server_retention_stats(guild.id, since_date=since_date)

        arrow = EMOJIS.get("arrow_point", "•")
        member_emoji = EMOJIS.get("member", "👥")
        announcement_emoji = EMOJIS.get("announcement", "📢")

        label_prefix = f"{days}d"
        net_prefix = "+" if stats["net_growth"] >= 0 else ""

        fields = [
            (
                f"{member_emoji} Server Population",
                f"{arrow} **Active Tracked:** `{int(stats['total_active']):,}`\n"
                f"{arrow} **Total Guild:** `{guild.member_count:,}`",
                True,
            ),
            (
                f"💬 {label_prefix} Chat Activity",
                f"{arrow} **Total Messages:** `{int(stats.get('total_messages', 0)):,}`",
                True,
            ),
            (
                f"🎙️ {label_prefix} Voice Activity",
                f"{arrow} **Time Logged:** `{stats.get('total_vc_hours', 0):,}h`",
                True,
            ),
            (
                f"{announcement_emoji} {label_prefix} Joins / Leaves",
                f"{arrow} **Joins:** `+{int(stats['total_joins']):,}`\n"
                f"{arrow} **Leaves:** `-{int(stats['total_leaves']):,}`",
                True,
            ),
            (
                f"📈 {label_prefix} Net Growth",
                f"{arrow} **Growth:** `{net_prefix}{int(stats['net_growth']):,}`",
                True,
            ),
            (
                f"🔒 {label_prefix} Member Retention",
                f"{arrow} **Rate:** `{stats['retention_rate']:.1f}%`",
                True,
            ),
        ]

        timeframe_label = (
            "Weekly (7 Days)"
            if days == 7
            else ("14 Days" if days == 14 else "Monthly (30 Days)")
        )

        embed = make_embed(
            title=f"Server Analytics — {guild.name}",
            description=f"*Detailed performance and engagement metrics for the last **{timeframe_label}**.*",
            level="INFO",
            fields=fields,
            show_timestamp=True,
            use_emoji=True,
        )
        if guild.icon:
            embed.set_thumbnail(url=guild.icon.url)
        return embed

    @commands.hybrid_command(
        name="serverstats",
        description="View server analytics for weekly, 14-day, or monthly periods.",
        aliases=["guildstats", "serveranalytics"],
    )
    @app_commands.describe(days="Select timeframe window (7, 14, or 30 days)")
    @app_commands.choices(days=[
        app_commands.Choice(name="7 Days (Weekly)", value=7),
        app_commands.Choice(name="14 Days", value=14),
        app_commands.Choice(name="30 Days (Monthly)", value=30),
    ])
    async def server_stats(
        self,
        ctx: commands.Context,
        days: Optional[int] = 7,
    ) -> None:
        if not ctx.guild:
            return

        selected_days = days if days in (7, 14, 30) else 7

        if ctx.interaction:
            await ctx.interaction.response.defer()

        embed = await self.generate_server_stats_embed(ctx.guild, days=selected_days)
        view = StatsTimeframeView(author_id=ctx.author.id, current_days=selected_days)

        if ctx.interaction:
            await ctx.interaction.followup.send(embed=embed, view=view)
            view.message = await ctx.interaction.original_response()
        else:
            view.message = await ctx.send(embed=embed, view=view)

    @commands.hybrid_command(
        name="peakactivity",
        description="Check peak server activity hours, days, and prime engagement windows.",
        aliases=["peakhours", "activitytimes"],
    )
    async def peak_activity(self, ctx: commands.Context) -> None:
        if not ctx.guild:
            return

        if ctx.interaction:
            await ctx.interaction.response.defer()

        top_hours = await get_peak_hours(ctx.guild.id, limit=5)
        day_names = [
            "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"
        ]
        arrow = EMOJIS.get("arrow_point", "•")

        if top_hours:
            max_msgs = max(h.message_count for h in top_hours) or 1
            density_bars = [" ", "▂", "▃", "▄", "▅", "▆", "▇", "█"]

            lines = []
            for h in top_hours[:3]:
                idx = min(len(density_bars) - 1, int((h.message_count / max_msgs) * (len(density_bars) - 1)))
                bar = density_bars[idx]
                lines.append(
                    f"{arrow} **{day_names[h.day_of_week]}** at **{h.hour_of_day:02d}:00 UTC** `[{bar}]` ↳ `{h.message_count:,}` msgs"
                )

            # Prime Window calculation
            best_hour = top_hours[0].hour_of_day
            start_window = (best_hour - 1) % 24
            end_window = (best_hour + 3) % 24
            prime_str = f"**{start_window:02d}:00 – {end_window:02d}:00 UTC**"
            best_day = day_names[top_hours[0].day_of_week]

            desc = (
                f"*Aggregated message density and optimal engagement times for {ctx.guild.name}.*\n\n"
                f"🔥 **Prime Activity Window:** {prime_str}\n"
                f"📅 **Peak Traffic Day:** **{best_day}**\n\n"
                f"**Top Peak Activity Hours:**\n"
                + "\n".join(lines)
            )
        else:
            desc = "No activity records accumulated yet. Chat in channels to generate analytics!"

        embed = make_embed(
            title=f"Peak Activity & Prime Hours — {ctx.guild.name}",
            description=desc,
            level="INFO",
            show_timestamp=True,
            use_emoji=True,
        )

        if ctx.interaction:
            await ctx.interaction.followup.send(embed=embed)
        else:
            await ctx.send(embed=embed)


async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(StatsCommands(bot))
