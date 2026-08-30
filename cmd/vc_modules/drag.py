from __future__ import annotations

import logging
from typing import Optional

import discord
from discord.ext import commands

from utils.core.embeds import make_embed
from utils.core.emojis import EMOJIS
from utils.handlers.vc_mod_handlers._drag_handler import drag_member
from utils.permissions.base_admin import BaseAdminCog

logger = logging.getLogger("DigitalVigital")


class VCDrag(BaseAdminCog):
    """Voice channel moderation cog for dragging a single member between voice channels."""

    def __init__(self, bot: commands.Bot):
        super().__init__()
        self.bot = bot

    async def _cleanup(self, ctx: commands.Context) -> None:
        """Safely delete original text invocation message if applicable."""
        try:
            await ctx.message.delete()
        except (discord.Forbidden, discord.NotFound, discord.HTTPException):
            pass

    @commands.command(
        name="drag",
        aliases=["mv", "move"],
        description=
        "Move a member from their current voice channel to another.",
    )
    @commands.guild_only()
    @commands.cooldown(2, 10, commands.BucketType.user)
    async def drag(
        self,
        ctx: commands.Context,
        member: discord.Member,
        channel: Optional[discord.VoiceChannel | discord.StageChannel] = None,
    ) -> None:
        """Drag a member to a specified voice channel or the user's current voice channel."""
        guild = ctx.guild
        author = ctx.author

        if guild is None or not isinstance(author, discord.Member):
            return

        footer_text = f"Action by: {author.display_name}"
        footer_icon = author.display_avatar.url

        # 1. Validation: Target Member Voice Connection Check
        if not member.voice or not member.voice.channel:
            embed = make_embed(
                title=f"{EMOJIS['fail']} Target Not Connected",
                description=
                f"{member.mention} is not currently in any voice channel.",
                level="ERROR",
                footer=footer_text,
                footer_icon=footer_icon,
            )
            await ctx.reply(embed=embed, mention_author=False)
            return

        source_channel = member.voice.channel

        # 2. Dynamic Channel Fallback: Resolve to Executor's VC if no target channel provided
        target_channel = channel
        if target_channel is None:
            if not author.voice or not author.voice.channel:
                embed = make_embed(
                    title=f"{EMOJIS['warning']} Missing Destination",
                    description=
                    ("Please specify a target channel or join a voice channel "
                     "so I know where to move the user."),
                    level="WARNING",
                    footer=footer_text,
                    footer_icon=footer_icon,
                )
                await ctx.reply(embed=embed, mention_author=False)
                return
            target_channel = author.voice.channel

        # 3. Validation: Same Voice Channel Check
        if source_channel.id == target_channel.id:
            embed = make_embed(
                title=f"{EMOJIS['warning']} Same Voice Channel",
                description=
                f"{member.mention} is already connected to {target_channel.mention}.",
                level="WARNING",
                footer=footer_text,
                footer_icon=footer_icon,
            )
            await ctx.reply(embed=embed, mention_author=False)
            return

        # 4. Validation: Prevent Self-Drag
        if member.id == author.id:
            embed = make_embed(
                title=f"{EMOJIS['warning']} Self Drag Restricted",
                description=
                "You cannot drag yourself using this command. Simply join the channel directly.",
                level="WARNING",
                footer=footer_text,
                footer_icon=footer_icon,
            )
            await ctx.reply(embed=embed, mention_author=False)
            return

        # 5. Role Hierarchy Protection: Prevent dragging equal or higher role members
        if member.top_role >= author.top_role and author.id != guild.owner_id:
            embed = make_embed(
                title=f"{EMOJIS['fail']} Hierarchy Restricted",
                description=
                f"You cannot move {member.mention} because their role is equal to or higher than yours.",
                level="ERROR",
                footer=footer_text,
                footer_icon=footer_icon,
            )
            await ctx.reply(embed=embed, mention_author=False)
            return

        # 6. Validation: Channel Capacity Check (Voice Channels only)
        if (isinstance(target_channel, discord.VoiceChannel)
                and target_channel.user_limit > 0
                and len(target_channel.members) >= target_channel.user_limit):
            embed = make_embed(
                title=f"{EMOJIS['fail']} Target Channel Full",
                description=
                f"{target_channel.mention} is at max capacity (`{len(target_channel.members)}/{target_channel.user_limit}`).",
                level="ERROR",
                footer=footer_text,
                footer_icon=footer_icon,
            )
            await ctx.reply(embed=embed, mention_author=False)
            return

        # 7. Permission Check: Moderator Permissions
        if (not target_channel.permissions_for(author).move_members
                or not source_channel.permissions_for(author).move_members):
            embed = make_embed(
                title=f"{EMOJIS['fail']} Permission Denied",
                description=
                "You need `Move Members` permissions in both the source and target voice channels.",
                level="ERROR",
                footer=footer_text,
                footer_icon=footer_icon,
            )
            await ctx.reply(embed=embed, mention_author=False)
            return

        # 8. Permission Check: Bot Permissions
        bot_member = guild.me
        if (not bot_member
                or not target_channel.permissions_for(bot_member).move_members
                or
                not source_channel.permissions_for(bot_member).move_members):
            embed = make_embed(
                title=f"{EMOJIS['fail']} Bot Permission Missing",
                description=
                "I lack `Move Members` permissions in one or both voice channels.",
                level="ERROR",
                footer=footer_text,
                footer_icon=footer_icon,
            )
            await ctx.reply(embed=embed, mention_author=False)
            return

        # 9. Execute Drag Action via handler
        reason_text = f"Voice Drag by {author} ({author.id})"
        success = await drag_member(
            member=member,
            target=target_channel,
            reason=reason_text,
        )

        if success:
            embed = make_embed(
                title=f"{EMOJIS['success']} Member Relocated",
                description=(f"Successfully moved {member.mention}!\n\n"
                             f"**From:** {source_channel.mention}\n"
                             f"**To:** {target_channel.mention}"),
                level="SUCCESS",
                footer=footer_text,
                footer_icon=footer_icon,
            )
            await ctx.reply(embed=embed, mention_author=False)
        else:
            embed = make_embed(
                title=f"{EMOJIS['fail']} Relocation Failed",
                description=
                "Failed to relocate the member. Please verify permissions or their connection state.",
                level="ERROR",
                footer=footer_text,
                footer_icon=footer_icon,
            )
            await ctx.reply(embed=embed, mention_author=False)

        await self._cleanup(ctx)

    @drag.error
    async def drag_error(
        self,
        ctx: commands.Context,
        error: commands.CommandError,
    ) -> None:
        """Centralized error handler for the drag command."""
        footer_text = f"Action by: {ctx.author.display_name}"
        footer_icon = ctx.author.display_avatar.url

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

        elif isinstance(error, commands.MissingPermissions):
            embed = make_embed(
                title=f"{EMOJIS['fail']} Missing Permission",
                description=
                "You require the `Move Members` permission to execute this command.",
                level="ERROR",
                footer=footer_text,
                footer_icon=footer_icon,
            )
            await ctx.reply(embed=embed, mention_author=False)

        elif isinstance(error, commands.MissingRequiredArgument):
            embed = make_embed(
                title=f"{EMOJIS['warning']} Invalid Syntax",
                description=
                f"Missing target member.\n**Usage:** `{ctx.prefix}drag <@member> [#channel]`",
                level="WARNING",
                footer=footer_text,
                footer_icon=footer_icon,
            )
            await ctx.reply(embed=embed, mention_author=False)

        elif isinstance(error, commands.MemberNotFound):
            embed = make_embed(
                title=f"{EMOJIS['fail']} Member Not Found",
                description=
                "Could not find the specified member in this server.",
                level="ERROR",
                footer=footer_text,
                footer_icon=footer_icon,
            )
            await ctx.reply(embed=embed, mention_author=False)

        elif isinstance(error, commands.CheckFailure):
            return

        else:
            embed = make_embed(
                title=f"{EMOJIS['fail']} Command Error",
                description=
                "An unexpected error occurred while processing the drag request.",
                level="ERROR",
                footer=footer_text,
                footer_icon=footer_icon,
            )
            logger.error(f"Error in drag command: {error}", exc_info=error)
            await ctx.reply(embed=embed, mention_author=False)


async def setup(bot: commands.Bot):
    await bot.add_cog(VCDrag(bot))
