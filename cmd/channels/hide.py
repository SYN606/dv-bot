import discord
from discord.ext import commands
from utils.permissions.base_admin import BaseAdminCog, admin_command
from utils.core.embeds import make_embed
from utils.core.emojis import EMOJIS

from db.db_helpers.channel_permissions import (apply_channel_permissions,
                                               has_channel_snapshots,
                                               restore_channel_permissions,
                                               snapshot_channel_permissions)

GuildChannel = discord.TextChannel | discord.ForumChannel | discord.VoiceChannel | discord.StageChannel
SUPPORTED_CHANNELS = (discord.TextChannel, discord.ForumChannel,
                      discord.VoiceChannel, discord.StageChannel)


class Hide(BaseAdminCog):

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    async def _reply(self,
                     ctx: commands.Context,
                     *,
                     title: str,
                     description: str,
                     level: str = "ERROR") -> None:
        try:
            embed = make_embed(title=title,
                               description=description,
                               level=level)
            embed.set_footer(text=f"Moderator: {ctx.author}",
                             icon_url=ctx.author.display_avatar.url)
            await ctx.reply(embed=embed, mention_author=False)
        except discord.HTTPException:
            pass

    async def _safe_restore(self, channel: GuildChannel, *,
                            reason: str) -> bool:
        try:
            return await restore_channel_permissions(channel, reason=reason)
        except discord.HTTPException:
            return False

    async def _safe_apply(self, channel: GuildChannel, *,
                          permissions: dict[str,
                                            bool | None], reason: str) -> bool:
        try:
            return await apply_channel_permissions(channel,
                                                   permissions,
                                                   reason=reason)
        except discord.HTTPException:
            return False

    async def _safe_snapshot(self, channel: GuildChannel, *,
                             permissions: list[str]) -> bool:
        try:
            await snapshot_channel_permissions(channel, permissions)
            return True
        except discord.HTTPException:
            return False

    async def _hide_channel(self, channel: GuildChannel,
                            actor: discord.Member) -> bool:
        guild = channel.guild
        if await has_channel_snapshots(guild.id, channel.id):
            return False

        snapshotted = await self._safe_snapshot(channel,
                                                permissions=["view_channel"])
        if not snapshotted:
            return False

        return await self._safe_apply(channel,
                                      permissions={"view_channel": False},
                                      reason=f"Channel hidden by {actor}")

    async def _unhide_channel(self, channel: GuildChannel,
                              actor: discord.Member) -> bool:
        return await self._safe_restore(channel,
                                        reason=f"Channel unhidden by {actor}")

    @admin_command(name="hide")
    @commands.cooldown(2, 5, commands.BucketType.guild)
    @commands.max_concurrency(1, per=commands.BucketType.channel, wait=False)
    async def hide(self, ctx: commands.Context):
        channel = ctx.channel
        if not isinstance(channel, SUPPORTED_CHANNELS):
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
                f"{EMOJIS.get('warning')} I need the `Manage Channels` permission to hide this channel.",
                level="WARNING")
            return

        if not await self._hide_channel(channel, actor):
            await self._reply(
                ctx,
                title="Action Cancelled",
                description=
                f"{EMOJIS.get('fail')} This channel is already hidden.",
                level="WARNING")
            return

        # 1. Dispatch confirmation payload
        await self._reply(
            ctx,
            title="Channel Hidden",
            description=
            f"{EMOJIS.get('success')} {channel.mention} has been hidden from public access.",
            level="SUCCESS")

        # 2. Safely remove command tracing afterward
        try:
            await ctx.message.delete()
        except (discord.Forbidden, discord.NotFound, discord.HTTPException):
            pass

    @admin_command(name="unhide")
    @commands.cooldown(2, 5, commands.BucketType.guild)
    @commands.max_concurrency(1, per=commands.BucketType.channel, wait=False)
    async def unhide(self, ctx: commands.Context):
        channel = ctx.channel
        if not isinstance(channel, SUPPORTED_CHANNELS):
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
                f"{EMOJIS.get('warning')} I need the `Manage Channels` permission to unhide this channel.",
                level="WARNING")
            return

        if not await self._unhide_channel(channel, actor):
            await self._reply(
                ctx,
                title="Action Cancelled",
                description=
                f"{EMOJIS.get('fail')} This channel is not currently hidden.",
                level="WARNING")
            return

        # 1. Dispatch restoration confirmation embed layout
        await self._reply(
            ctx,
            title="Channel Unhidden",
            description=
            f"{EMOJIS.get('success')} {channel.mention} is now visible again.",
            level="SUCCESS")

        # 2. Safely remove command tracing afterward
        try:
            await ctx.message.delete()
        except (discord.Forbidden, discord.NotFound, discord.HTTPException):
            pass

    @hide.error  # type: ignore
    async def hide_cmd_error(self, ctx: commands.Context,
                             error: commands.CommandError):
        await self._handle_shared_errors(ctx, error)

    @unhide.error  # type: ignore
    async def unhide_cmd_error(self, ctx: commands.Context,
                               error: commands.CommandError):
        await self._handle_shared_errors(ctx, error)

    async def _handle_shared_errors(self, ctx: commands.Context,
                                    error: commands.CommandError):
        if isinstance(error, commands.CommandOnCooldown):
            await self._reply(
                ctx,
                title="Command on Cooldown",
                description=
                f"{EMOJIS.get('red_dot')} You are doing that too fast. Please wait **{error.retry_after:.1f}s** and try again.",
                level="WARNING")
            return

        if isinstance(error, commands.MaxConcurrencyReached):
            await self._reply(
                ctx,
                title="Operation in Progress",
                description=
                f"{EMOJIS.get('loading')} Another visibility update is already processing in this channel. Please wait.",
                level="WARNING")
            return

        if isinstance(error, commands.CheckFailure):
            await self._reply(
                ctx,
                title="Access Denied",
                description=
                f"{EMOJIS.get('ban')} You do not have permission to use this command.",
                level="WARNING")
            return

        raise error


async def setup(bot: commands.Bot):
    await bot.add_cog(Hide(bot))
