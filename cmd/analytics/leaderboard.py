from __future__ import annotations

import discord
from discord import app_commands
from discord.ext import commands

from db.db_helpers.analytics import get_top_chatters, get_top_vc_members
from utils.core.embeds import make_embed
from utils.core.emojis import EMOJIS


class LeaderboardCommands(commands.Cog):
    """Public commands for displaying server activity leaderboards."""

    def __init__(self, bot: commands.Bot) -> None:
        self.bot = bot

    @app_commands.command(
        name="topchatters",
        description="Display top message chatters in the server.",
    )
    async def top_chatters_slash(self,
                                 interaction: discord.Interaction) -> None:
        if not interaction.guild:
            return
        await interaction.response.defer()
        embed = await self._generate_top_chatters(interaction.guild)
        await interaction.followup.send(embed=embed)

    @commands.command(
        name="topchatters",
        help="Display top message chatters in the server.",
    )
    async def top_chatters_prefix(self, ctx: commands.Context) -> None:
        if not ctx.guild:
            return
        embed = await self._generate_top_chatters(ctx.guild)
        await ctx.send(embed=embed)

    async def _generate_top_chatters(self,
                                     guild: discord.Guild) -> discord.Embed:
        top_members = await get_top_chatters(guild.id, limit=10)
        arrow = EMOJIS.get("arrow_point", "•")
        crown = EMOJIS.get("neon_crown", "👑")

        lines = []
        for idx, m in enumerate(top_members, 1):
            prefix = crown if idx == 1 else f"**#{idx}**"
            lines.append(
                f"{prefix} <@{m.user_id}> {arrow} `{m.weekly_messages:,}` messages"
            )

        return make_embed(
            title=f"Top Text Chatters (Weekly) — {guild.name}",
            description="\n".join(lines)
            if lines else "No text activity recorded yet.",
            level="SUCCESS",
            show_timestamp=True,
            use_emoji=True,
        )

    @app_commands.command(
        name="topvc", description="Display top voice channel active members.")
    async def top_vc_slash(self, interaction: discord.Interaction) -> None:
        if not interaction.guild:
            return
        await interaction.response.defer()
        embed = await self._generate_top_vc(interaction.guild)
        await interaction.followup.send(embed=embed)

    @commands.command(
        name="topvc",
        help="Display top voice channel active members.",
    )
    async def top_vc_prefix(self, ctx: commands.Context) -> None:
        if not ctx.guild:
            return
        embed = await self._generate_top_vc(ctx.guild)
        await ctx.send(embed=embed)

    async def _generate_top_vc(self, guild: discord.Guild) -> discord.Embed:
        top_members = await get_top_vc_members(guild.id, limit=10)
        arrow = EMOJIS.get("arrow_point", "•")
        crown = EMOJIS.get("neon_crown", "👑")

        lines = []
        for idx, m in enumerate(top_members, 1):
            prefix = crown if idx == 1 else f"**#{idx}**"
            hours = m.weekly_vc_seconds // 3600
            minutes = (m.weekly_vc_seconds % 3600) // 60
            lines.append(
                f"{prefix} <@{m.user_id}> {arrow} `{hours}h {minutes}m`")

        return make_embed(
            title=f"Top VC Members (Weekly) — {guild.name}",
            description="\n".join(lines)
            if lines else "No voice activity recorded yet.",
            level="SUCCESS",
            show_timestamp=True,
            use_emoji=True,
        )


async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(LeaderboardCommands(bot))
