from __future__ import annotations

import logging
from typing import List, Optional, Tuple

import discord
from discord.ext import commands

from utils.core.embeds import make_embed
from utils.core.emojis import EMOJIS
from utils.handlers.vc_mod_handlers.moveall_handler import move_all_members
from utils.permissions.base_admin import BaseAdminCog

logger = logging.getLogger("DigitalVigital")


class VCMoveAll(BaseAdminCog):
    """Voice channel moderation cog for bulk moving members between voice channels."""

    def __init__(self, bot: commands.Bot):
        super().__init__()
        self.bot = bot

    async def _cleanup(self, ctx: commands.Context) -> None:
        """Safely delete original text invocation message if applicable."""
        if ctx.interaction:
            return
        try:
            await ctx.message.delete()
        except (discord.Forbidden, discord.NotFound, discord.HTTPException):
            pass

    @commands.command(
        name="moveall",
        aliases=["dragall", "mvall"],
        description=
        "Move all users between voice channels safely without rate-limits.",
    )
    @commands.guild_only()
    @commands.cooldown(1, 10, commands.BucketType.guild)
    @commands.max_concurrency(1, per=commands.BucketType.guild, wait=False)
    async def moveall(
        self,
        ctx: commands.Context,
        source: discord.VoiceChannel | discord.StageChannel,
        target: discord.VoiceChannel | discord.StageChannel,
    ):
        """Move all members currently in the source voice channel to the target channel."""
        author = ctx.author
        guild = ctx.guild

        if guild is None or not isinstance(author, discord.Member):
            return

        footer_text = f"Action by: {author}"
        footer_icon = author.display_avatar.url

        # 1. Validation: Same VC Check
        if source.id == target.id:
            embed = make_embed(
                title=f"{EMOJIS['warning']} Same Channel",
                description=
                "Source and target voice channels cannot be identical.",
                level="WARNING",
                footer=footer_text,
                footer_icon=footer_icon,
            )
            await ctx.reply(embed=embed, mention_author=False)
            return

        # 2. Validation: Source emptiness check
        members_to_move = list(source.members)
        total_members = len(members_to_move)

        if total_members == 0:
            embed = make_embed(
                title=f"{EMOJIS['warning']} Empty Channel",
                description=f"No connected users found in {source.mention}.",
                level="WARNING",
                footer=footer_text,
                footer_icon=footer_icon,
            )
            await ctx.reply(embed=embed, mention_author=False)
            return

        # 3. Validation: Target Channel User Limit Check
        if target.user_limit > 0:
            available_slots = target.user_limit - len(target.members)
            if available_slots <= 0:
                embed = make_embed(
                    title=f"{EMOJIS['fail']} Target Full",
                    description=
                    f"{target.mention} is full (`{len(target.members)}/{target.user_limit}`).",
                    level="ERROR",
                    footer=footer_text,
                    footer_icon=footer_icon,
                )
                await ctx.reply(embed=embed, mention_author=False)
                return

        # 4. Permission Check: Author
        if not source.permissions_for(
                author).move_members or not target.permissions_for(
                    author).move_members:
            embed = make_embed(
                title=f"{EMOJIS['fail']} Permission Denied",
                description=
                "You require `Move Members` permission in both channels.",
                level="ERROR",
                footer=footer_text,
                footer_icon=footer_icon,
            )
            await ctx.reply(embed=embed, mention_author=False)
            return

        # 5. Permission Check: Bot
        bot_member = guild.me
        if (not bot_member
                or not source.permissions_for(bot_member).move_members
                or not target.permissions_for(bot_member).move_members):
            embed = make_embed(
                title=f"{EMOJIS['fail']} Bot Permissions Missing",
                description=
                "I lack `Move Members` permission in one or both of those channels.",
                level="ERROR",
                footer=footer_text,
                footer_icon=footer_icon,
            )
            await ctx.reply(embed=embed, mention_author=False)
            return

        # 6. Process Initiation Feedback
        progress_embed = make_embed(
            title=f"{EMOJIS['loading']} Relocating Members...",
            description=
            f"Migrating `{total_members}` user(s) from {source.mention} to {target.mention}...",
            level="INFO",
            footer=footer_text,
            footer_icon=footer_icon,
        )
        progress_msg = await ctx.reply(embed=progress_embed,
                                       mention_author=False)

        # 7. Delegate Execution to moveall_handler
        successful_moves = await move_all_members(
            source=source,
            target=target,
            reason=f"VC MoveAll executed by {author} ({author.id})",
        )
        failed_moves = total_members - successful_moves

        # 8. Summary Output
        if successful_moves > 0:
            summary_embed = make_embed(
                title=f"{EMOJIS['success']} Migration Complete",
                description=
                (f"{EMOJIS['arrow_point']} Moved `{successful_moves}/{total_members}` users "
                 f"from {source.mention} to {target.mention}.\n" +
                 (f"{EMOJIS['fail']} Failed: `{failed_moves}` user(s)"
                  if failed_moves > 0 else "")),
                level="SUCCESS" if failed_moves == 0 else "WARNING",
                footer=footer_text,
                footer_icon=footer_icon,
            )
        else:
            summary_embed = make_embed(
                title=f"{EMOJIS['fail']} Migration Failed",
                description=
                "Failed to relocate users. Verify connectivity or hierarchy permissions.",
                level="ERROR",
                footer=footer_text,
                footer_icon=footer_icon,
            )

        await progress_msg.edit(embed=summary_embed)
        await self._cleanup(ctx)

    @moveall.error
    async def moveall_error(self, ctx: commands.Context,
                            error: commands.CommandError):
        """Centralized error processing hook for the moveall command."""
        author = ctx.author
        footer_text = f"Action by: {author}"
        footer_icon = author.display_avatar.url

        if isinstance(error, commands.CommandOnCooldown):
            embed = make_embed(
                title=f"{EMOJIS['warning']} Command Cooldown",
                description=
                f"Please wait `{error.retry_after:.1f}s` before using this command again.",
                level="WARNING",
                footer=footer_text,
                footer_icon=footer_icon,
            )
            await ctx.reply(embed=embed, mention_author=False)

        elif isinstance(error, commands.MaxConcurrencyReached):
            embed = make_embed(
                title=f"{EMOJIS['warning']} Command Busy",
                description=
                "Another bulk migration operation is currently running in this server.",
                level="WARNING",
                footer=footer_text,
                footer_icon=footer_icon,
            )
            await ctx.reply(embed=embed, mention_author=False)

        elif isinstance(error, commands.MissingRequiredArgument):
            embed = make_embed(
                title=f"{EMOJIS['warning']} Invalid Syntax",
                description=
                f"Missing required parameters.\n**Usage:** `{ctx.prefix}moveall <#source-vc> <#target-vc>`",
                level="WARNING",
                footer=footer_text,
                footer_icon=footer_icon,
            )
            await ctx.reply(embed=embed, mention_author=False)

        elif isinstance(error, commands.ChannelNotFound):
            embed = make_embed(
                title=f"{EMOJIS['fail']} Channel Not Found",
                description=
                "Please supply a valid Voice or Stage channel mention/ID.",
                level="ERROR",
                footer=footer_text,
                footer_icon=footer_icon,
            )
            await ctx.reply(embed=embed, mention_author=False)

        elif isinstance(error, commands.CheckFailure):
            pass


async def setup(bot: commands.Bot):
    await bot.add_cog(VCMoveAll(bot))
