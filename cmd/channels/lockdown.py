import asyncio
import discord
from discord.ext import commands
from utils.permissions.base_admin import BaseAdminCog
from utils.core.embeds import make_embed
from utils.core.emojis import EMOJIS
from db.db_helpers.channel_permissions import (apply_channel_permissions,
                                               has_channel_snapshots,
                                               restore_channel_permissions,
                                               snapshot_channel_permissions)

SUPPORTED_CHANNELS = (discord.TextChannel, discord.ForumChannel)


def parse_duration(duration: str | None, ) -> int | None:

    if not duration:
        return None
    unit = duration[-1].lower()
    value = duration[:-1]

    if not value.isdigit():
        return None
    amount = int(value)

    if unit == "s":
        return amount

    if unit == "m":
        return amount * 60

    if unit == "h":
        return amount * 3600

    return None


class Lockdown(BaseAdminCog):

    def __init__(self, bot: commands.Bot):

        self.bot = bot

    async def _reply(self,
                     ctx: commands.Context,
                     *,
                     title: str,
                     description: str,
                     level: str = "ERROR") -> None:

        try:
            await ctx.reply(
                embed=make_embed(title=title,
                                 description=description,
                                 level=level),
                mention_author=False,
            )

        except discord.HTTPException:
            pass

    async def _safe_restore(self, channel: (discord.TextChannel
                                            | discord.ForumChannel), *,
                            reason: str) -> bool:

        try:
            return await restore_channel_permissions(
                channel,
                reason=reason,
            )

        except (
                discord.Forbidden,
                discord.NotFound,
                discord.HTTPException,
        ):
            return False

    async def _safe_apply(self, channel: (discord.TextChannel
                                          | discord.ForumChannel), *,
                          permissions: dict[
                              str,
                              bool | None,
                          ], reason: str) -> bool:

        try:
            await apply_channel_permissions(
                channel,
                permissions,
                reason=reason,
            )
            return True

        except (
                discord.Forbidden,
                discord.NotFound,
                discord.HTTPException,
        ):
            return False

    async def _safe_snapshot(self, channel: (discord.TextChannel
                                             | discord.ForumChannel), *,
                             permissions: list[str]) -> bool:

        try:
            await snapshot_channel_permissions(
                channel,
                permissions,
            )
            return True
        except discord.HTTPException:
            return False

    async def _lock_channel(self, channel: (discord.TextChannel
                                            | discord.ForumChannel),
                            actor: discord.Member) -> bool:
        guild = channel.guild
        if await has_channel_snapshots(
                guild.id,
                channel.id,
        ):
            return False

        snapshotted = await self._safe_snapshot(channel,
                                                permissions=[
                                                    "send_messages",
                                                    "send_messages_in_threads",
                                                ])

        if not snapshotted:
            return False
        applied = await self._safe_apply(channel,
                                         permissions={
                                             "send_messages": False,
                                             "send_messages_in_threads": False,
                                         },
                                         reason=f"Locked by {actor}")

        return applied

    async def _unlock_channel(self,
                              channel: (discord.TextChannel
                                        | discord.ForumChannel),
                              actor: discord.Member | None = None) -> bool:

        reason = "Unlocked"
        if actor:
            reason = (f"Unlocked by "
                      f"{actor}")

        return await self._safe_restore(channel, reason=reason)

    @commands.command(name="lock", )
    @commands.cooldown(2, 5, commands.BucketType.guild)
    @commands.max_concurrency(1, per=commands.BucketType.channel, wait=False)
    async def lock(self, ctx: commands.Context, duration: str | None = None):

        channel = ctx.channel
        if not isinstance(channel, SUPPORTED_CHANNELS):
            return

        actor = ctx.author

        if not isinstance(actor, discord.Member):
            return

        me = ctx.guild.me  # type: ignore

        if me is None:
            return

        permissions = channel.permissions_for(me, )
        if not permissions.manage_channels:

            await self._reply(ctx,
                              title="Missing Permissions",
                              description=(f"{EMOJIS['warning']} "
                                           "I need `Manage Channels` "
                                           "permission."),
                              level="WARNING")

            return

        success = await self._lock_channel(channel, actor)

        if not success:
            await self._reply(ctx,
                              title="Already Locked",
                              description=(f"{EMOJIS['warning']} "
                                           "This channel is already "
                                           "locked or I could not "
                                           "edit its permissions."),
                              level="WARNING")

            return

        await self._reply(ctx,
                          title="Channel Locked",
                          description=(f"{EMOJIS['announcement']} "
                                       f"{channel.mention} locked by "
                                       f"{actor.mention}."),
                          level="WARNING")

        seconds = parse_duration(duration, )

        if seconds:

            async def unlock_later():

                try:
                    await asyncio.sleep(seconds, )
                    await self._safe_restore(channel,
                                             reason="Automatic unlock")

                except Exception:
                    pass

            asyncio.create_task(unlock_later())

    lock.admin_command = True  # type: ignore

    @commands.command(name="unlock")
    @commands.cooldown(2, 5, commands.BucketType.guild)
    @commands.max_concurrency(1, per=commands.BucketType.channel, wait=False)
    async def unlock(self, ctx: commands.Context):
        channel = ctx.channel
        if not isinstance(channel, SUPPORTED_CHANNELS):
            return

        actor = ctx.author

        if not isinstance(actor, discord.Member):
            return

        me = ctx.guild.me  # type: ignore

        if me is None:
            return

        permissions = channel.permissions_for(me)
        if not permissions.manage_channels:

            await self._reply(ctx,
                              title="Missing Permissions",
                              description=(f"{EMOJIS['warning']} "
                                           "I need `Manage Channels` "
                                           "permission."),
                              level="WARNING")

            return

        success = await self._unlock_channel(
            channel,
            actor,
        )

        if not success:

            await self._reply(ctx,
                              title="Not Locked",
                              description=(f"{EMOJIS['warning']} "
                                           "This channel is not locked "
                                           "or I could not restore "
                                           "its permissions."),
                              level="WARNING")

            return
        await self._reply(ctx,
                          title="Channel Unlocked",
                          description=(f"{EMOJIS['success']} "
                                       f"{channel.mention} unlocked by "
                                       f"{actor.mention}."),
                          level="SUCCESS")

    unlock.admin_command = True  # type: ignore

    @lock.error
    @unlock.error
    async def lockdown_error(self, ctx: commands.Context,
                             error: commands.CommandError):
        if isinstance(error, commands.CommandOnCooldown):
            await self._reply(ctx,
                              title="Slow Down",
                              description=(f"{EMOJIS['warning']} "
                                           "You are using this "
                                           "command too quickly."),
                              level="WARNING")

            return

        if isinstance(
                error,
                commands.MaxConcurrencyReached,
        ):
            await self._reply(ctx,
                              title="Channel Busy",
                              description=(f"{EMOJIS['warning']} "
                                           "A lockdown operation "
                                           "is already running "
                                           "for this channel."),
                              level="WARNING")

            return
        raise error


async def setup(bot: commands.Bot, ):
    await bot.add_cog(Lockdown(bot), )
