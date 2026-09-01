from __future__ import annotations

from datetime import datetime, timezone

import discord
from discord import app_commands
from discord.ext import commands

from db.db_helpers.analytics import get_user_stats
from utils.core.embeds import make_embed
from utils.core.emojis import EMOJIS


class UserStatsCommands(commands.Cog):
    """Public commands for checking user activity statistics."""

    def __init__(self, bot: commands.Bot) -> None:
        self.bot = bot

    @staticmethod
    def _format_vc_time(seconds: int) -> str:
        """Formats raw seconds into a structured duration string (e.g., 2h 05m)."""
        hours, remainder = divmod(seconds, 3600)
        minutes, _ = divmod(remainder, 60)
        if hours > 0:
            return f"{hours}h {minutes:02d}m"
        return f"{minutes}m"

    async def _generate_user_stats(self, guild: discord.Guild,
                                   target: discord.Member) -> discord.Embed:
        if target.bot:
            return make_embed(
                title="User Activity Stats",
                description=
                f"{target.mention} is a bot. Bots are excluded from server activity tracking and auto-roles.",
                level="WARNING",
                use_emoji=True,
            )

        record = await get_user_stats(guild.id, target.id)
        if not record:
            return make_embed(
                title="User Activity Stats",
                description=
                f"No tracking history recorded for {target.mention}.",
                level="WARNING",
                use_emoji=True,
            )

        arrow = EMOJIS.get("arrow_point", "•")

        # Calculate active voice channel time dynamically if the user is currently in a VC
        extra_vc_seconds = 0
        if record.active_vc_start:
            now = datetime.now(timezone.utc)
            extra_vc_seconds = max(
                0, int((now - record.active_vc_start).total_seconds()))

        total_vc = record.total_vc_seconds + extra_vc_seconds
        weekly_vc = record.weekly_vc_seconds + extra_vc_seconds

        weekly_vc_formatted = self._format_vc_time(weekly_vc)
        total_vc_formatted = self._format_vc_time(total_vc)

        fields = [
            (
                "📅 Weekly Activity",
                f"{arrow} **Messages:** `{record.weekly_messages:,}`\n"
                f"{arrow} **Voice Time:** `{weekly_vc_formatted}`",
                True,
            ),
            (
                "🏆 All-Time Activity",
                f"{arrow} **Messages:** `{record.total_messages:,}`\n"
                f"{arrow} **Voice Time:** `{total_vc_formatted}`",
                True,
            ),
            (
                "Server History",
                f"{arrow} **Joined:** <t:{int(record.joined_at.timestamp())}:R>\n"
                f"{arrow} **Last Active:** " +
                (f"<t:{int(record.last_active_at.timestamp())}:R>"
                 if record.last_active_at else "`Never`"),
                False,
            ),
        ]

        if record.active_vc_start:
            fields.append((
                "🎙️ Active Voice Session",
                f"{arrow} Connected <t:{int(record.active_vc_start.timestamp())}:R>",
                False,
            ))

        return make_embed(
            title=f"Activity Profile — {target.display_name}",
            level="INFO",
            fields=fields,
            author=target.display_name,
            author_icon=target.display_avatar.url,
            show_timestamp=True,
            use_emoji=True,
        )

    @app_commands.command(
        name="userstats",
        description="Check detailed user activity statistics.",
    )
    @app_commands.describe(
        member="The member whose activity statistics you want to view.")
    async def user_stats_slash(
        self,
        interaction: discord.Interaction,
        member: discord.Member | None = None,
    ) -> None:
        if not interaction.guild:
            return

        await interaction.response.defer()
        target = member or (interaction.user if isinstance(
            interaction.user, discord.Member) else None)
        if not target:
            return

        embed = await self._generate_user_stats(interaction.guild, target)
        await interaction.followup.send(embed=embed)

    @commands.command(
        name="userstats",
        help=
        "Check detailed user activity statistics. Usage: dv userstats [@member]",
    )
    async def user_stats_prefix(
        self,
        ctx: commands.Context,
        member: discord.Member | None = None,
    ) -> None:
        if not ctx.guild:
            return

        target = member or (ctx.author if isinstance(ctx.author,
                                                     discord.Member) else None)
        if not target:
            return

        embed = await self._generate_user_stats(ctx.guild, target)
        await ctx.send(embed=embed)


async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(UserStatsCommands(bot))
