from __future__ import annotations

import logging
from typing import Optional, Union

import discord
from discord.ext import commands

from db.db_helpers.channel_permissions import (
    apply_channel_permissions,
    has_channel_snapshots,
    restore_channel_permissions,
    snapshot_channel_permissions,
)
from utils.core.embeds import make_embed
from utils.core.emojis import EMOJIS
from utils.permissions.base_admin import BaseAdminCog, admin_command

logger = logging.getLogger("Digital Vigital")

GuildChannel = Union[
    discord.TextChannel,
    discord.ForumChannel,
    discord.VoiceChannel,
    discord.StageChannel,
]
SUPPORTED_CHANNELS = (
    discord.TextChannel,
    discord.ForumChannel,
    discord.VoiceChannel,
    discord.StageChannel,
)


class Hide(BaseAdminCog):
    """Cog providing visibility toggles to hide and unhide channel interfaces."""

    def __init__(self, bot: commands.Bot) -> None:
        self.bot = bot

    async def _reply(
        self,
        ctx: commands.Context,
        *,
        title: str,
        description: str,
        level: str = "ERROR",
    ) -> None:
        """Utility method to dispatch structured embed responses."""
        try:
            embed = make_embed(
                title=title,
                description=description,
                level=level,
            )
            embed.set_footer(
                text=f"Moderator: {ctx.author}",
                icon_url=ctx.author.display_avatar.url,
            )
            await ctx.reply(embed=embed, mention_author=False)
        except discord.HTTPException as exc:
            logger.error("Failed to send reply embed in hide cog: %s", exc)

    async def _safe_restore(self, channel: GuildChannel, *,
                            reason: str) -> bool:
        """Safely attempt to restore permissions snapshot."""
        try:
            return await restore_channel_permissions(channel, reason=reason)
        except discord.HTTPException as exc:
            logger.error("Error during permission restore: %s", exc)
            return False

    async def _safe_apply(
        self,
        channel: GuildChannel,
        *,
        permissions: dict[str, Optional[bool]],
        reason: str,
    ) -> bool:
        """Safely attempt to override channel view permissions."""
        try:
            return await apply_channel_permissions(channel,
                                                   permissions,
                                                   reason=reason)
        except discord.HTTPException as exc:
            logger.error("Error applying channel permissions: %s", exc)
            return False

    async def _safe_snapshot(self, channel: GuildChannel, *,
                             permissions: list[str]) -> bool:
        """Safely snapshot existing state of channel permissions."""
        try:
            await snapshot_channel_permissions(channel, permissions)
            return True
        except discord.HTTPException as exc:
            logger.error("Error taking permission snapshot: %s", exc)
            return False

    async def _hide_channel(self, channel: GuildChannel,
                            actor: discord.Member) -> bool:
        """Snapshot current state and apply view restriction."""
        guild = channel.guild
        if await has_channel_snapshots(guild.id, channel.id):
            return False

        snapshotted = await self._safe_snapshot(channel,
                                                permissions=["view_channel"])
        if not snapshotted:
            return False

        return await self._safe_apply(
            channel,
            permissions={"view_channel": False},
            reason=f"Channel hidden by {actor}",
        )

    async def _unhide_channel(self, channel: GuildChannel,
                              actor: discord.Member) -> bool:
        """Restore channel permissions from prior snapshot state."""
        return await self._safe_restore(channel,
                                        reason=f"Channel unhidden by {actor}")

    @admin_command(name="hide")
    @commands.cooldown(2, 5, commands.BucketType.guild)
    @commands.max_concurrency(1, per=commands.BucketType.channel, wait=False)
    async def hide(
        self,
        ctx: commands.Context,
        target_channel: Optional[GuildChannel] = None,
    ) -> None:
        """Hide a channel from public view by overriding View Channel permissions."""
        channel = target_channel or ctx.channel
        if not isinstance(channel, SUPPORTED_CHANNELS):
            await self._reply(
                ctx,
                title="Unsupported Channel",
                description=
                (f"{EMOJIS.get('warning', '⚠️')} This channel type cannot be hidden."
                 ),
                level="WARNING",
            )
            return

        actor = ctx.author
        if not isinstance(actor, discord.Member):
            return

        me = ctx.guild.me if ctx.guild else None
        if me is None:
            return

        if not channel.permissions_for(me).manage_channels:
            await self._reply(
                ctx,
                title="Missing Permissions",
                description=
                (f"{EMOJIS.get('warning', '⚠️')} I need the `Manage Channels` permission to hide {channel.mention}."
                 ),
                level="WARNING",
            )
            return

        if not await self._hide_channel(channel, actor):
            await self._reply(
                ctx,
                title="Action Cancelled",
                description=
                (f"{EMOJIS.get('fail', '❌')} {channel.mention} is already hidden or configured."
                 ),
                level="WARNING",
            )
            return

        # Dispatch confirmation payload
        await self._reply(
            ctx,
            title="Channel Hidden",
            description=
            (f"{EMOJIS.get('success', '✅')} {channel.mention} has been hidden from public access."
             ),
            level="SUCCESS",
        )

        # Safely remove trigger message if action was executed in target channel
        if channel.id == ctx.channel.id:
            try:
                await ctx.message.delete()
            except (
                    discord.Forbidden,
                    discord.NotFound,
                    discord.HTTPException,
            ):
                pass

    @admin_command(name="unhide")
    @commands.cooldown(2, 5, commands.BucketType.guild)
    @commands.max_concurrency(1, per=commands.BucketType.channel, wait=False)
    async def unhide(
        self,
        ctx: commands.Context,
        target_channel: Optional[GuildChannel] = None,
    ) -> None:
        """Restore public channel visibility using saved snapshot records."""
        channel = target_channel or ctx.channel
        if not isinstance(channel, SUPPORTED_CHANNELS):
            await self._reply(
                ctx,
                title="Unsupported Channel",
                description=
                (f"{EMOJIS.get('warning', '⚠️')} This channel type cannot be unhidden."
                 ),
                level="WARNING",
            )
            return

        actor = ctx.author
        if not isinstance(actor, discord.Member):
            return

        me = ctx.guild.me if ctx.guild else None
        if me is None:
            return

        if not channel.permissions_for(me).manage_channels:
            await self._reply(
                ctx,
                title="Missing Permissions",
                description=
                (f"{EMOJIS.get('warning', '⚠️')} I need the `Manage Channels` permission to unhide {channel.mention}."
                 ),
                level="WARNING",
            )
            return

        if not await self._unhide_channel(channel, actor):
            await self._reply(
                ctx,
                title="Action Cancelled",
                description=
                (f"{EMOJIS.get('fail', '❌')} {channel.mention} is not currently hidden."
                 ),
                level="WARNING",
            )
            return

        # Dispatch restoration confirmation
        await self._reply(
            ctx,
            title="Channel Unhidden",
            description=
            (f"{EMOJIS.get('success', '✅')} {channel.mention} is now visible again."
             ),
            level="SUCCESS",
        )

        # Safely remove trigger message if action was executed in target channel
        if channel.id == ctx.channel.id:
            try:
                await ctx.message.delete()
            except (
                    discord.Forbidden,
                    discord.NotFound,
                    discord.HTTPException,
            ):
                pass

    @hide.error  # type: ignore
    async def hide_cmd_error(self, ctx: commands.Context,
                             error: commands.CommandError) -> None:
        await self._handle_shared_errors(ctx, error)

    @unhide.error  # type: ignore
    async def unhide_cmd_error(self, ctx: commands.Context,
                               error: commands.CommandError) -> None:
        await self._handle_shared_errors(ctx, error)

    async def _handle_shared_errors(self, ctx: commands.Context,
                                    error: commands.CommandError) -> None:
        """Centralized error handling with registry emojis."""
        if isinstance(error, commands.CommandOnCooldown):
            await self._reply(
                ctx,
                title="Command on Cooldown",
                description=
                (f"{EMOJIS.get('red_dot', '🔴')} You are doing that too fast. Please wait **{error.retry_after:.1f}s** and try again."
                 ),
                level="WARNING",
            )
            return

        if isinstance(error, commands.MaxConcurrencyReached):
            await self._reply(
                ctx,
                title="Operation in Progress",
                description=
                (f"{EMOJIS.get('loading', '⏳')} Another visibility update is already processing in this channel. Please wait."
                 ),
                level="WARNING",
            )
            return

        if isinstance(error, commands.CheckFailure):
            await self._reply(
                ctx,
                title="Access Denied",
                description=
                (f"{EMOJIS.get('ban', '🚫')} You do not have permission to use this command."
                 ),
                level="WARNING",
            )
            return

        raise error


async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(Hide(bot))
