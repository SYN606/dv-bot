from __future__ import annotations

from typing import Literal, Optional, Union

import discord
from discord import app_commands
from discord.ext import commands

from db.db_helpers.analytics import get_top_chatters, get_top_vc_members
from utils.core.embeds import make_embed
from utils.core.emojis import EMOJIS

TimeframeType = Literal["weekly", "all_time"]
MetricType = Literal["chat", "vc"]


def _make_progress_bar(value: int, max_val: int, length: int = 7) -> str:
    """Generates a compact visual progress bar."""
    if max_val <= 0:
        return "▱" * length
    filled = max(1, round((value / max_val) * length))
    filled = min(length, filled)
    return "▰" * filled + "▱" * (length - filled)


def _format_vc_duration(seconds: int) -> str:
    """Formats seconds into readable hours and minutes."""
    hours = seconds // 3600
    minutes = (seconds % 3600) // 60
    if hours > 0:
        return f"{hours}h {minutes:02d}m"
    return f"{minutes}m"


class LeaderboardView(discord.ui.View):
    """Interactive controls allowing toggling between Chat/Voice and Weekly/All-Time."""

    def __init__(
        self,
        author_id: int,
        guild: discord.Guild,
        current_metric: MetricType = "chat",
        current_timeframe: TimeframeType = "weekly",
        timeout: float = 120.0,
    ) -> None:
        super().__init__(timeout=timeout)
        self.author_id = author_id
        self.guild = guild
        self.metric: MetricType = current_metric
        self.timeframe: TimeframeType = current_timeframe
        self.message: Optional[Union[discord.Message, discord.InteractionMessage]] = None
        self._update_buttons()

    def _update_buttons(self) -> None:
        self.btn_chat.disabled = (self.metric == "chat")
        self.btn_vc.disabled = (self.metric == "vc")
        self.btn_weekly.disabled = (self.timeframe == "weekly")
        self.btn_all_time.disabled = (self.timeframe == "all_time")

    async def _update_view(self, interaction: discord.Interaction) -> None:
        self._update_buttons()
        embed = await LeaderboardCommands.build_leaderboard_embed(
            self.guild, self.metric, self.timeframe
        )
        await interaction.response.edit_message(embed=embed, view=self)

    @discord.ui.button(label="Chat", style=discord.ButtonStyle.primary, emoji="💬", row=0)
    async def btn_chat(self, interaction: discord.Interaction, button: discord.ui.Button) -> None:
        if interaction.user.id != self.author_id:
            await interaction.response.send_message(
                f"{EMOJIS.get('fail', '❌')} You cannot control this leaderboard.",
                ephemeral=True,
            )
            return
        self.metric = "chat"
        await self._update_view(interaction)

    @discord.ui.button(label="Voice", style=discord.ButtonStyle.primary, emoji="🎙️", row=0)
    async def btn_vc(self, interaction: discord.Interaction, button: discord.ui.Button) -> None:
        if interaction.user.id != self.author_id:
            await interaction.response.send_message(
                f"{EMOJIS.get('fail', '❌')} You cannot control this leaderboard.",
                ephemeral=True,
            )
            return
        self.metric = "vc"
        await self._update_view(interaction)

    @discord.ui.button(label="Weekly", style=discord.ButtonStyle.secondary, emoji="📅", row=0)
    async def btn_weekly(self, interaction: discord.Interaction, button: discord.ui.Button) -> None:
        if interaction.user.id != self.author_id:
            await interaction.response.send_message(
                f"{EMOJIS.get('fail', '❌')} You cannot control this leaderboard.",
                ephemeral=True,
            )
            return
        self.timeframe = "weekly"
        await self._update_view(interaction)

    @discord.ui.button(label="All-Time", style=discord.ButtonStyle.secondary, emoji="🏆", row=0)
    async def btn_all_time(self, interaction: discord.Interaction, button: discord.ui.Button) -> None:
        if interaction.user.id != self.author_id:
            await interaction.response.send_message(
                f"{EMOJIS.get('fail', '❌')} You cannot control this leaderboard.",
                ephemeral=True,
            )
            return
        self.timeframe = "all_time"
        await self._update_view(interaction)

    @discord.ui.button(label="Refresh", style=discord.ButtonStyle.success, emoji="🔄", row=0)
    async def btn_refresh(self, interaction: discord.Interaction, button: discord.ui.Button) -> None:
        if interaction.user.id != self.author_id:
            await interaction.response.send_message(
                f"{EMOJIS.get('fail', '❌')} You cannot control this leaderboard.",
                ephemeral=True,
            )
            return
        await self._update_view(interaction)

    async def on_timeout(self) -> None:
        for item in self.children:
            if isinstance(item, discord.ui.Button):
                item.disabled = True
        if self.message:
            try:
                await self.message.edit(view=self)
            except (discord.NotFound, discord.HTTPException):
                pass


class LeaderboardCommands(commands.Cog):
    """Commands for inspecting interactive server text and voice leaderboards."""

    def __init__(self, bot: commands.Bot) -> None:
        self.bot = bot

    @staticmethod
    async def build_leaderboard_embed(
        guild: discord.Guild,
        metric: MetricType,
        timeframe: TimeframeType,
    ) -> discord.Embed:
        timeframe_label = "Weekly" if timeframe == "weekly" else "All-Time"
        medals = {1: "🥇", 2: "🥈", 3: "🥉"}

        if metric == "chat":
            top_members = await get_top_chatters(guild.id, timeframe=timeframe, limit=10)
            title = f"💬 Top Chatters ({timeframe_label}) — {guild.name}"
            if not top_members:
                return make_embed(
                    title=title,
                    description=f"No text activity recorded for **{timeframe_label.lower()}** yet.",
                    level="INFO",
                )

            max_score = (
                top_members[0].weekly_messages
                if timeframe == "weekly"
                else top_members[0].total_messages
            )
            lines = []
            for idx, m in enumerate(top_members, 1):
                badge = medals.get(idx, f"`#{idx:02d}`")
                score = m.weekly_messages if timeframe == "weekly" else m.total_messages
                bar = _make_progress_bar(score, max_score, length=6)
                user_obj = guild.get_member(m.user_id)
                name_str = f"**{user_obj.display_name}**" if user_obj else f"<@{m.user_id}>"
                lines.append(f"{badge} {name_str}\n↳ `{bar}` **{score:,}** messages")

            content = "\n\n".join(lines)
            desc = f"*Showing top text chatters for {timeframe_label.lower()} activity.*\n\n{content}"
            return make_embed(
                title=title,
                description=desc,
                level="SUCCESS",
                footer=f"Server: {guild.name} • Filter: {timeframe_label}",
                show_timestamp=True,
            )

        else:
            top_members = await get_top_vc_members(guild.id, timeframe=timeframe, limit=10)
            title = f"🎙️ Top Voice Members ({timeframe_label}) — {guild.name}"
            if not top_members:
                return make_embed(
                    title=title,
                    description=f"No voice activity recorded for **{timeframe_label.lower()}** yet.",
                    level="INFO",
                )

            max_score = (
                top_members[0].weekly_vc_seconds
                if timeframe == "weekly"
                else top_members[0].total_vc_seconds
            )
            lines = []
            for idx, m in enumerate(top_members, 1):
                badge = medals.get(idx, f"`#{idx:02d}`")
                score = m.weekly_vc_seconds if timeframe == "weekly" else m.total_vc_seconds
                bar = _make_progress_bar(score, max_score, length=6)
                duration_str = _format_vc_duration(score)
                user_obj = guild.get_member(m.user_id)
                name_str = f"**{user_obj.display_name}**" if user_obj else f"<@{m.user_id}>"
                lines.append(f"{badge} {name_str}\n↳ `{bar}` **{duration_str}**")

            content = "\n\n".join(lines)
            desc = f"*Showing top voice members for {timeframe_label.lower()} activity.*\n\n{content}"
            return make_embed(
                title=title,
                description=desc,
                level="SUCCESS",
                footer=f"Server: {guild.name} • Filter: {timeframe_label}",
                show_timestamp=True,
            )

    @commands.hybrid_command(
        name="topchatters",
        description="Display top message chatters in the server.",
        aliases=["chatleaderboard", "topmessages"],
    )
    @app_commands.describe(timeframe="Timeframe window (weekly or all_time)")
    @app_commands.choices(timeframe=[
        app_commands.Choice(name="Weekly (Last 7 Days)", value="weekly"),
        app_commands.Choice(name="All-Time", value="all_time"),
    ])
    async def top_chatters(
        self,
        ctx: commands.Context,
        timeframe: Optional[str] = "weekly",
    ) -> None:
        if not ctx.guild:
            return

        tf: TimeframeType = "all_time" if timeframe and timeframe.lower() in ("all_time", "all", "total") else "weekly"
        embed = await self.build_leaderboard_embed(ctx.guild, metric="chat", timeframe=tf)
        view = LeaderboardView(
            author_id=ctx.author.id,
            guild=ctx.guild,
            current_metric="chat",
            current_timeframe=tf,
        )

        if ctx.interaction:
            if ctx.interaction.response.is_done():
                await ctx.interaction.followup.send(embed=embed, view=view)
                view.message = await ctx.interaction.original_response()
            else:
                await ctx.interaction.response.send_message(embed=embed, view=view)
                view.message = await ctx.interaction.original_response()
        else:
            view.message = await ctx.send(embed=embed, view=view)

    @commands.hybrid_command(
        name="topvc",
        description="Display top voice channel active members.",
        aliases=["vcleaderboard", "topvoice"],
    )
    @app_commands.describe(timeframe="Timeframe window (weekly or all_time)")
    @app_commands.choices(timeframe=[
        app_commands.Choice(name="Weekly (Last 7 Days)", value="weekly"),
        app_commands.Choice(name="All-Time", value="all_time"),
    ])
    async def top_vc(
        self,
        ctx: commands.Context,
        timeframe: Optional[str] = "weekly",
    ) -> None:
        if not ctx.guild:
            return

        tf: TimeframeType = "all_time" if timeframe and timeframe.lower() in ("all_time", "all", "total") else "weekly"
        embed = await self.build_leaderboard_embed(ctx.guild, metric="vc", timeframe=tf)
        view = LeaderboardView(
            author_id=ctx.author.id,
            guild=ctx.guild,
            current_metric="vc",
            current_timeframe=tf,
        )

        if ctx.interaction:
            if ctx.interaction.response.is_done():
                await ctx.interaction.followup.send(embed=embed, view=view)
                view.message = await ctx.interaction.original_response()
            else:
                await ctx.interaction.response.send_message(embed=embed, view=view)
                view.message = await ctx.interaction.original_response()
        else:
            view.message = await ctx.send(embed=embed, view=view)


async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(LeaderboardCommands(bot))
