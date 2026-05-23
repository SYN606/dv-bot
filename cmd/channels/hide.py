import discord

from discord.ext import commands

from utils.permissions.base_admin import (BaseAdminCog, admin_command)

from utils.core.embeds import make_embed
from utils.core.emojis import EMOJIS

from db.db_helpers.channel_permissions import (apply_channel_permissions,
                                               has_channel_snapshots,
                                               restore_channel_permissions,
                                               snapshot_channel_permissions)

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

            await ctx.reply(embed=make_embed(title=title,
                                             description=description,
                                             level=level),
                            mention_author=False)

        except discord.HTTPException:
            pass

    async def _safe_restore(self, channel: (discord.TextChannel
                                            | discord.ForumChannel
                                            | discord.VoiceChannel
                                            | discord.StageChannel), *,
                            reason: str) -> bool:

        try:

            return await restore_channel_permissions(channel, reason=reason)

        except discord.HTTPException:
            return False

    async def _safe_apply(self, channel: (discord.TextChannel
                                          | discord.ForumChannel
                                          | discord.VoiceChannel
                                          | discord.StageChannel), *,
                          permissions: dict[str,
                                            bool | None], reason: str) -> bool:

        try:

            await apply_channel_permissions(channel,
                                            permissions,
                                            reason=reason)

            return True

        except discord.HTTPException:
            return False

    async def _safe_snapshot(self, channel: (discord.TextChannel
                                             | discord.ForumChannel
                                             | discord.VoiceChannel
                                             | discord.StageChannel), *,
                             permissions: list[str]) -> bool:

        try:

            await snapshot_channel_permissions(channel, permissions)

            return True

        except discord.HTTPException:
            return False

    async def _hide_channel(self, channel: (discord.TextChannel
                                            | discord.ForumChannel
                                            | discord.VoiceChannel
                                            | discord.StageChannel),
                            actor: discord.Member) -> bool:

        guild = channel.guild

        if await has_channel_snapshots(guild.id, channel.id):
            return False

        snapshotted = await self._safe_snapshot(channel,
                                                permissions=["view_channel"])

        if not snapshotted:
            return False

        applied = await self._safe_apply(channel,
                                         permissions={"view_channel": False},
                                         reason=f"Hidden by {actor}")

        return applied

    async def _unhide_channel(self, channel: (discord.TextChannel
                                              | discord.ForumChannel
                                              | discord.VoiceChannel
                                              | discord.StageChannel),
                              actor: discord.Member) -> bool:

        return await self._safe_restore(channel, reason=f"Unhidden by {actor}")

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

        success = await self._hide_channel(channel, actor)

        if not success:

            await self._reply(ctx,
                              title="Already Hidden",
                              description=(f"{EMOJIS['warning']} "
                                           "This channel is already "
                                           "hidden or I could not "
                                           "edit its permissions."),
                              level="WARNING")

            return

        await self._reply(ctx,
                          title="Channel Hidden",
                          description=(f"{EMOJIS['announcement']} "
                                       f"{channel.mention} hidden by "
                                       f"{actor.mention}."),
                          level="WARNING")

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

        success = await self._unhide_channel(channel, actor)

        if not success:

            await self._reply(ctx,
                              title="Not Hidden",
                              description=(f"{EMOJIS['warning']} "
                                           "This channel is not hidden "
                                           "or I could not restore "
                                           "its permissions."),
                              level="WARNING")

            return

        await self._reply(ctx,
                          title="Channel Unhidden",
                          description=(f"{EMOJIS['success']} "
                                       f"{channel.mention} unhidden by "
                                       f"{actor.mention}."),
                          level="SUCCESS")

    @hide.error
    @unhide.error
    async def hide_error(self, ctx: commands.Context,
                         error: commands.CommandError):

        if isinstance(error, commands.CommandOnCooldown):

            await self._reply(ctx,
                              title="Slow Down",
                              description=(f"{EMOJIS['warning']} "
                                           "You are using this "
                                           "command too quickly."),
                              level="WARNING")

            return

        if isinstance(error, commands.MaxConcurrencyReached):

            await self._reply(ctx,
                              title="Channel Busy",
                              description=(f"{EMOJIS['warning']} "
                                           "A hide operation is "
                                           "already running for "
                                           "this channel."),
                              level="WARNING")

            return

        if isinstance(error, commands.CheckFailure):

            await self._reply(ctx,
                              title="Access Denied",
                              description=(f"{EMOJIS['warning']} "
                                           "You do not have permission "
                                           "to use this command."),
                              level="WARNING")

            return

        raise error


async def setup(bot: commands.Bot):
    await bot.add_cog(Hide(bot))
