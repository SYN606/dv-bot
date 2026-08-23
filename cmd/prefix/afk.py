from __future__ import annotations

import asyncio
import logging
from typing import Optional

import discord
from discord.ext import commands

from db.db_helpers.afk import remove_afk, set_afk
from utils.core.embeds import make_embed
from utils.core.emojis import EMOJIS
from utils.permissions.check_perms import is_bot_admin_ctx
from utils.views.afk_button import GlobalAFKView

logger = logging.getLogger("DigitalVigital")

AFK_PREFIX = "[AFK] "


async def _set_nickname(member: discord.Member, new_nick: str) -> None:
    """Helper to update user nickname in background without blocking execution flow."""
    try:
        await member.edit(nick=new_nick)
    except (discord.Forbidden, discord.HTTPException) as exc:
        logger.debug("Failed to update nickname for %s: %s", member, exc)


class AFK(commands.Cog):
    """Cog for managing user AFK statuses within guilds."""

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    async def _cleanup(self, ctx: commands.Context) -> None:
        """Safely delete original text invocation message if applicable."""
        if ctx.interaction:
            return
        try:
            await ctx.message.delete()
        except (discord.Forbidden, discord.NotFound, discord.HTTPException):
            pass

    @commands.group(
        name="afk",
        invoke_without_command=True,
        help="Mark yourself as AFK",
    )
    @commands.guild_only()
    async def afk(
        self,
        ctx: commands.Context,
        *,
        afk_reason: str = "AFK",
    ) -> None:
        """Set your status to local AFK by default with an optional button for Global AFK."""
        if ctx.guild is None:
            return

        author = ctx.author
        afk_reason = afk_reason.strip()[:200] or "AFK"

        # Execute DB save first (local by default)
        await set_afk(ctx.guild.id, author.id, afk_reason, is_global=False)

        # Non-blocking nickname update task
        if isinstance(author, discord.Member
                      ) and ctx.guild.me.guild_permissions.manage_nicknames:
            if not author.display_name.startswith(AFK_PREFIX):
                new_name = f"{AFK_PREFIX}{author.display_name}"
                if len(new_name) <= 32:
                    asyncio.create_task(_set_nickname(author, new_name))

        embed = make_embed(
            title="Local AFK Enabled",
            description=
            (f"{EMOJIS.get('okay', '👌')} {author.mention} is now AFK in **{ctx.guild.name}**.\n"
             f"{EMOJIS.get('arrow_point', '➡️')} Reason: {afk_reason}"),
            level="SUCCESS",
        )
        embed.set_footer(
            text=f"Action by : {author}",
            icon_url=author.display_avatar.url,
        )

        view = GlobalAFKView(
            author_id=author.id,
            guild_id=ctx.guild.id,
            afk_reason=afk_reason,
        )

        # Send response and attach message reference to view for timeout handling
        sent_msg = await ctx.send(embed=embed, view=view)
        view.message = sent_msg

        # Run message cleanup asynchronously
        asyncio.create_task(self._cleanup(ctx))

    @afk.command(name="reset", help="Reset AFK status of a server user")
    @commands.guild_only()
    async def afk_reset(
        self,
        ctx: commands.Context,
        member: Optional[discord.Member] = None,
    ) -> None:
        """Reset another user's AFK status (Requires Admin/Owner authority)."""
        if ctx.guild is None:
            return

        author = ctx.author

        # Validation: Missing target user
        if member is None:
            embed = make_embed(
                title="Invalid Usage",
                description="Correct Usage: `afk reset @user`",
                level="WARNING",
            )
            embed.set_footer(
                text=f"Action by : {author}",
                icon_url=author.display_avatar.url,
            )
            await ctx.send(embed=embed)
            return

        # Validation: Self-reset check
        if member.id == author.id:
            embed = make_embed(
                title="Invalid Action",
                description=
                "You cannot reset your own AFK status via this command structure.",
                level="WARNING",
            )
            embed.set_footer(
                text=f"Action by : {author}",
                icon_url=author.display_avatar.url,
            )
            await ctx.send(embed=embed)
            return

        if not isinstance(author, discord.Member):
            return

        # Authority validation
        is_allowed = (author.id == ctx.guild.owner_id
                      or author.guild_permissions.administrator
                      or await is_bot_admin_ctx(ctx))

        if not is_allowed:
            embed = make_embed(
                title="Permission Denied",
                description=
                "You do not have enough system authority to clear another user's AFK status.",
                level="ERROR",
            )
            embed.set_footer(
                text=f"Action by : {author}",
                icon_url=author.display_avatar.url,
            )
            await ctx.send(embed=embed)
            return

        # Execute DB removal
        removed = await remove_afk(ctx.guild.id, member.id)

        if not removed:
            embed = make_embed(
                title="AFK Reset Failed",
                description=
                f"{EMOJIS.get('warning', '⚠️')} {member.mention} is not currently marked as AFK.",
                level="WARNING",
            )
            embed.set_footer(
                text=f"Action by : {author}",
                icon_url=author.display_avatar.url,
            )
            await ctx.send(embed=embed)
            return

        # Restore original nickname in background task
        if ctx.guild.me.guild_permissions.manage_nicknames:
            if member.display_name.startswith(AFK_PREFIX):
                new_name = member.display_name.removeprefix(AFK_PREFIX)
                asyncio.create_task(_set_nickname(member, new_name))

        reason_text = getattr(
            removed,
            "afk_reason",
            None,
        ) or (removed.get("afk_reason")  # type: ignore
              if isinstance(removed, dict) else "AFK")

        embed = make_embed(
            title="AFK Reset Successful",
            description=
            (f"{EMOJIS.get('success', '✅')} Cleared AFK markers for {member.mention}\n"
             f"{EMOJIS.get('arrow_point', '➡️')} Stored Reason was: {reason_text}"
             ),
            level="SUCCESS",
        )
        embed.set_footer(
            text=f"Action by : {author}",
            icon_url=author.display_avatar.url,
        )

        await asyncio.gather(
            ctx.send(embed=embed),
            self._cleanup(ctx),
            return_exceptions=True,
        )

    @afk.error
    @afk_reset.error
    async def afk_error(self, ctx: commands.Context,
                        error: commands.CommandError) -> None:
        """Cog-level error handler for AFK commands."""
        if isinstance(error, commands.NoPrivateMessage):
            await ctx.send(embed=make_embed(
                title="Guild Only",
                description="This command can only be used within a server.",
                level="ERROR",
            ))


async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(AFK(bot))
