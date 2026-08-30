from __future__ import annotations

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

    @app_commands.command(
        name="userstats",
        description="Check detailed user activity statistics.",
    )
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
        help="Check detailed user activity statistics.",
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

    async def _generate_user_stats(self, guild: discord.Guild,
                                   target: discord.Member) -> discord.Embed:
        record = await get_user_stats(guild.id, target.id)
        if not record:
            return make_embed(
                title="User Activity Stats",
                description=
                f"No tracking history recorded for {target.mention}.",
                level="WARNING",
                use_emoji=True,
            )

        hours = record.total_vc_seconds // 3600
        minutes = (record.total_vc_seconds % 3600) // 60
        arrow = EMOJIS.get("arrow_point", "•")

        fields = [
            (
                "Joined Server",
                f"{arrow} <t:{int(record.joined_at.timestamp())}:R>",
                True,
            ),
            ("Messages Sent", f"{arrow} `{record.total_messages:,}`", True),
            ("Voice Time", f"{arrow} `{hours}h {minutes}m`", True),
        ]

        if record.last_active_at:
            fields.append((
                "Last Active",
                f"{arrow} <t:{int(record.last_active_at.timestamp())}:R>",
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


async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(UserStatsCommands(bot))
