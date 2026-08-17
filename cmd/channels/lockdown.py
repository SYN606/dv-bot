import asyncio
import logging
import time
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

logger = logging.getLogger("LockdownCog")

# Python 3.12+ PEP 695 Type Alias
type GuildChannel = discord.TextChannel | discord.ForumChannel
SUPPORTED_CHANNELS = (discord.TextChannel, discord.ForumChannel)


def parse_duration(duration: str | None) -> int | None:
    """Parse a time string with units (s, m, h, d) into total seconds."""
    if not duration:
        return None

    unit = duration[-1].lower()
    value = duration[:-1]
    if not value.isdigit():
        return None

    amount = int(value)
    if amount <= 0:
        return None

    match unit:
        case "s":
            return amount
        case "m":
            return amount * 60
        case "h":
            return amount * 3600
        case "d":
            return amount * 86400
        case _:
            return None


class Lockdown(BaseAdminCog):
    """Cog managing server lockdowns and temporary channel restrictions."""

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
        try:
            embed = make_embed(title=title, description=description, level=level)
            embed.set_footer(
                text=f"Moderator: {ctx.author}",
                icon_url=ctx.author.display_avatar.url,
            )
            await ctx.reply(embed=embed, mention_author=False)
        except discord.HTTPException as exc:
            logger.debug("Failed to send reply embed: %s", exc)

    async def _safe_restore(self, channel: GuildChannel, *, reason: str) -> bool:
        try:
            return await restore_channel_permissions(channel, reason=reason)
        except discord.HTTPException as exc:
            logger.error("Failed restoring permissions for %s: %s", channel.id, exc)
            return False

    async def _safe_apply(
        self,
        channel: GuildChannel,
        *,
        permissions: dict[str, bool | None],
        reason: str,
    ) -> bool:
        try:
            return await apply_channel_permissions(channel, permissions, reason=reason)
        except discord.HTTPException as exc:
            logger.error("Failed applying permissions for %s: %s", channel.id, exc)
            return False

    async def _safe_snapshot(
        self, channel: GuildChannel, *, permissions: list[str]
    ) -> bool:
        try:
            await snapshot_channel_permissions(channel, permissions)
            return True
        except discord.HTTPException as exc:
            logger.error("Failed creating permission snapshot for %s: %s", channel.id, exc)
            return False

    async def _lock_channel(self, channel: GuildChannel, actor: discord.Member) -> bool:
        guild = channel.guild
        if await has_channel_snapshots(guild.id, channel.id):
            return False

        snapshotted = await self._safe_snapshot(
            channel, permissions=["send_messages", "send_messages_in_threads"]
        )
        if not snapshotted:
            return False

        return await self._safe_apply(
            channel,
            permissions={
                "send_messages": False,
                "send_messages_in_threads": False,
            },
            reason=f"Channel locked by {actor}",
        )

    async def _unlock_channel(
        self, channel: GuildChannel, actor: discord.Member | None = None
    ) -> bool:
        reason = (
            "Temporary lockdown expired"
            if actor is None
            else f"Channel unlocked by {actor}"
        )
        return await self._safe_restore(channel, reason=reason)

    @admin_command(name="lock")
    @commands.cooldown(2, 5, commands.BucketType.guild)
    @commands.max_concurrency(1, per=commands.BucketType.channel, wait=False)
    async def lock(
        self,
        ctx: commands.Context,
        duration: str | None = None,
        target_channel: GuildChannel | None = None,
    ) -> None:
        channel = target_channel or ctx.channel
        if not isinstance(channel, SUPPORTED_CHANNELS):
            await self._reply(
                ctx,
                title="Unsupported Channel",
                description=f"{EMOJIS.get('warning', '⚠️')} This channel type cannot be locked down.",
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
                description=(
                    f"{EMOJIS.get('warning', '⚠️')} I need the `Manage Channels` permission to lock "
                    f"{channel.mention}."
                ),
                level="WARNING",
            )
            return

        if not await self._lock_channel(channel, actor):
            await self._reply(
                ctx,
                title="Action Cancelled",
                description=f"{EMOJIS.get('fail', '❌')} {channel.mention} is already locked down.",
                level="WARNING",
            )
            return

        seconds = parse_duration(duration)
        if seconds:
            expiry_timestamp = int(time.time() + seconds)
            success_desc = (
                f"{EMOJIS.get('announcement', '📢')} {channel.mention} has been temporarily locked down.\n\n"
                f"{EMOJIS.get('arrow_point', '➡️')} **Unlocks:** <t:{expiry_timestamp}:R>"
            )
        else:
            success_desc = (
                f"{EMOJIS.get('announcement', '📢')} {channel.mention} is now locked. "
                "Users will not be able to send messages until it is unlocked."
            )

        # 1. Output verification message
        await self._reply(
            ctx,
            title="Channel Locked",
            description=success_desc,
            level="WARNING",
        )

        # 2. Deletion buffer execution
        if channel.id == ctx.channel.id:
            try:
                await ctx.message.delete()
            except (discord.Forbidden, discord.NotFound, discord.HTTPException):
                pass

        if seconds:
            async def unlock_later() -> None:
                try:
                    await asyncio.sleep(seconds)
                    unlocked = await self._unlock_channel(channel, actor=None)
                    if unlocked:
                        embed = make_embed(
                            title="Lockdown Expired",
                            description=f"{EMOJIS.get('success', '✅')} {channel.mention} has been automatically unlocked.",
                            level="SUCCESS",
                        )
                        try:
                            await channel.send(embed=embed) # type: ignore
                        except discord.HTTPException:
                            pass
                except asyncio.CancelledError:
                    pass

            task = asyncio.create_task(unlock_later())
            # Python 3.12 safe background task exception handling
            task.add_done_callback(
                lambda t: logger.error(
                    "Error in unlock_later task: %s", t.exception()
                ) if not t.cancelled() and t.exception() else None
            )

    @admin_command(name="unlock")
    @commands.cooldown(2, 5, commands.BucketType.guild)
    @commands.max_concurrency(1, per=commands.BucketType.channel, wait=False)
    async def unlock(
        self, ctx: commands.Context, target_channel: GuildChannel | None = None
    ) -> None:
        channel = target_channel or ctx.channel
        if not isinstance(channel, SUPPORTED_CHANNELS):
            await self._reply(
                ctx,
                title="Unsupported Channel",
                description=f"{EMOJIS.get('warning', '⚠️')} This channel type cannot be unlocked.",
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
                description=(
                    f"{EMOJIS.get('warning', '⚠️')} I need the `Manage Channels` permission to unlock "
                    f"{channel.mention}."
                ),
                level="WARNING",
            )
            return

        if not await self._unlock_channel(channel, actor):
            await self._reply(
                ctx,
                title="Action Cancelled",
                description=f"{EMOJIS.get('fail', '❌')} {channel.mention} is not currently locked.",
                level="WARNING",
            )
            return

        # 1. Output verification message
        await self._reply(
            ctx,
            title="Channel Unlocked",
            description=(
                f"{EMOJIS.get('success', '✅')} The lockdown on {channel.mention} has been lifted. "
                "Chat permissions have been restored to normal."
            ),
            level="SUCCESS",
        )

        # 2. Deletion buffer execution
        if channel.id == ctx.channel.id:
            try:
                await ctx.message.delete()
            except (discord.Forbidden, discord.NotFound, discord.HTTPException):
                pass

    @lock.error  # type: ignore
    async def lock_cmd_error(
        self, ctx: commands.Context, error: commands.CommandError
    ) -> None:
        await self._handle_shared_errors(ctx, error)

    @unlock.error  # type: ignore
    async def unlock_cmd_error(
        self, ctx: commands.Context, error: commands.CommandError
    ) -> None:
        await self._handle_shared_errors(ctx, error)

    async def _handle_shared_errors(
        self, ctx: commands.Context, error: commands.CommandError
    ) -> None:
        if isinstance(error, commands.CommandOnCooldown):
            await self._reply(
                ctx,
                title="Command on Cooldown",
                description=(
                    f"{EMOJIS.get('red_dot', '🔴')} You are doing that too fast. "
                    f"Please wait **{error.retry_after:.1f}s** and try again."
                ),
                level="WARNING",
            )
            return

        if isinstance(error, commands.MaxConcurrencyReached):
            await self._reply(
                ctx,
                title="Operation in Progress",
                description=(
                    f"{EMOJIS.get('loading', '⏳')} Another lockdown action is already processing in this channel. "
                    "Please wait."
                ),
                level="WARNING",
            )
            return

        if isinstance(error, commands.CheckFailure):
            await self._reply(
                ctx,
                title="Access Denied",
                description=f"{EMOJIS.get('ban', '🚫')} You do not have permission to use this command.",
                level="WARNING",
            )
            return

        raise error


async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(Lockdown(bot))