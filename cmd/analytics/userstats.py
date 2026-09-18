from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

import discord
from discord import app_commands
from discord.ext import commands

from db.db_helpers.analytics import get_user_rank, get_user_stats
from utils.core.embeds import make_embed
from utils.core.emojis import EMOJIS


def _format_vc_time(seconds: int) -> str:
    """Formats raw seconds into readable duration string (e.g., 2h 05m)."""
    hours, remainder = divmod(seconds, 3600)
    minutes, _ = divmod(remainder, 60)
    if hours > 0:
        return f"{hours}h {minutes:02d}m"
    return f"{minutes}m"


class UserStatsCommands(commands.Cog):
    """Commands for checking detailed user activity profiles and server rankings."""

    def __init__(self, bot: commands.Bot) -> None:
        self.bot = bot

    async def _generate_user_stats(
        self, guild: discord.Guild, target: discord.Member
    ) -> discord.Embed:
        if target.bot:
            return make_embed(
                title="User Activity Stats",
                description=f"{target.mention} is a bot. Bots are excluded from server activity tracking.",
                level="WARNING",
                use_emoji=True,
            )

        record = await get_user_stats(guild.id, target.id)
        if not record:
            return make_embed(
                title=f"Activity Profile — {target.display_name}",
                description=f"No tracking history recorded for {target.mention} yet.",
                level="INFO",
                use_emoji=True,
            )

        ranks = await get_user_rank(guild.id, target.id)
        arrow = EMOJIS.get("arrow_point", "•")

        # Dynamic active voice channel time
        extra_vc_seconds = 0
        if record.active_vc_start:
            now = datetime.now(timezone.utc)
            extra_vc_seconds = max(0, int((now - record.active_vc_start).total_seconds()))

        total_vc = record.total_vc_seconds + extra_vc_seconds
        weekly_vc = record.weekly_vc_seconds + extra_vc_seconds

        weekly_vc_str = _format_vc_time(weekly_vc)
        total_vc_str = _format_vc_time(total_vc)

        total_tracked = ranks.get("total_members") or 1
        t_rank = f"**#{ranks['text_rank']}** of {total_tracked}" if ranks.get("text_rank") else "*Unranked*"
        v_rank = f"**#{ranks['vc_rank']}** of {total_tracked}" if ranks.get("vc_rank") else "*Unranked*"

        fields = [
            (
                "🏆 Server Rankings",
                f"{arrow} **Text Activity:** {t_rank}\n{arrow} **Voice Activity:** {v_rank}",
                False,
            ),
            (
                "📅 Weekly Activity",
                f"{arrow} **Messages:** `{record.weekly_messages:,}`\n{arrow} **Voice Time:** `{weekly_vc_str}`",
                True,
            ),
            (
                "🌟 All-Time Activity",
                f"{arrow} **Messages:** `{record.total_messages:,}`\n{arrow} **Voice Time:** `{total_vc_str}`",
                True,
            ),
            (
                "⏱️ History & Status",
                f"{arrow} **Joined Server:** <t:{int(record.joined_at.timestamp())}:R>\n{arrow} **Last Active:** "
                + (f"<t:{int(record.last_active_at.timestamp())}:R>" if record.last_active_at else "`Never`"),
                False,
            ),
        ]

        if record.active_vc_start and target.voice and target.voice.channel:
            session_duration = _format_vc_time(extra_vc_seconds)
            fields.append((
                "🎙️ Active Voice Session",
                f"🟢 In {target.voice.channel.mention} for `{session_duration}`",
                False,
            ))

        embed = make_embed(
            title=f"Activity Profile — {target.display_name}",
            description=f"Activity overview for {target.mention}",
            level="INFO",
            fields=fields,
            author=target.display_name,
            author_icon=target.display_avatar.url,
            show_timestamp=True,
            use_emoji=True,
        )
        embed.set_thumbnail(url=target.display_avatar.url)
        return embed

    @commands.hybrid_command(
        name="userstats",
        description="Check detailed user activity statistics and server rankings.",
        aliases=["activity", "uactivity", "mystats"],
    )
    @app_commands.describe(member="The member whose activity statistics you want to view")
    async def user_stats(
        self,
        ctx: commands.Context,
        member: Optional[discord.Member] = None,
    ) -> None:
        if not ctx.guild:
            return

        target = member or (ctx.author if isinstance(ctx.author, discord.Member) else None)
        if not target:
            return

        if ctx.interaction:
            await ctx.interaction.response.defer()

        embed = await self._generate_user_stats(ctx.guild, target)

        if ctx.interaction:
            await ctx.interaction.followup.send(embed=embed)
        else:
            await ctx.send(embed=embed)


async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(UserStatsCommands(bot))
