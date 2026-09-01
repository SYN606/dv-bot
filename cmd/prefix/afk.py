from __future__ import annotations

import asyncio
import logging
from typing import TYPE_CHECKING, Optional

import discord
from discord.ext import commands

from db.db_helpers.afk import set_afk
from utils.core.embeds import make_embed
from utils.handlers.afk._afk_nicknames import apply_afk_nicknames, handle_afk
from utils.views.afk_button import GlobalAFKView

if TYPE_CHECKING:
    from discord.ext.commands import Context

logger = logging.getLogger("DigitalVigital")


class AFKCog(commands.Cog):
    """Cog handling AFK status management, global toggles, and mention notifications."""

    def __init__(self, bot: commands.Bot) -> None:
        self.bot: commands.Bot = bot

    @commands.hybrid_command(name="afk", description="Set your AFK status.")
    async def afk_command(self, ctx: Context, *, reason: str = "AFK") -> None:
        if not ctx.guild:
            embed = make_embed(
                title="Command Error",
                description="This command can only be used within a server.",
                level="ERROR",
                use_emoji=True,
            )
            await ctx.send(embed=embed, ephemeral=True)
            return

        guild_id: int = ctx.guild.id
        user_id: int = ctx.author.id

        original_nick: Optional[str] = (ctx.author.nick if isinstance(
            ctx.author, discord.Member) else None)

        await set_afk(
            guild_id=guild_id,
            user_id=user_id,
            reason=reason,
            is_global=False,
            original_nickname=original_nick,
        )

        # Update nickname asynchronously
        asyncio.create_task(
            apply_afk_nicknames(
                bot=self.bot,
                user_id=user_id,
                is_global=False,
                current_guild=ctx.guild,
            ))

        view = GlobalAFKView(
            guild_id=guild_id,
            author_id=user_id,
            afk_reason=reason,
            is_global=False,
        )

        embed = make_embed(
            title="AFK Status Set",
            description=f"{ctx.author.mention} is now AFK: **{reason}**",
            level="INFO",
            footer=
            "Use the button below to toggle global AFK scope across shared servers.",
            use_emoji=True,
        )

        await ctx.send(embed=embed, view=view)

    @commands.Cog.listener()
    async def on_message(self, message: discord.Message) -> None:
        """Delegates AFK state checking and mention handling to interceptor."""
        await handle_afk(self.bot, message)


async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(AFKCog(bot))
