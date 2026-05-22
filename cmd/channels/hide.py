import discord

from discord.ext import commands

from utils.permissions.base_admin import BaseAdminCog

from utils.core.embeds import make_embed
from utils.core.emojis import EMOJIS

from db.db_helpers.channel_permissions import (
    apply_channel_permissions,
    has_channel_snapshots,
    restore_channel_permissions,
    snapshot_channel_permissions,
)

SUPPORTED_CHANNELS = (
    discord.TextChannel,
    discord.ForumChannel,
    discord.VoiceChannel,
    discord.StageChannel,
)


class Hide(
        BaseAdminCog, ):

    def __init__(
        self,
        bot: commands.Bot,
    ):

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

            await ctx.reply(
                embed=make_embed(
                    title=title,
                    description=description,
                    level=level,
                ),
                mention_author=False,
            )

        except discord.HTTPException:
            pass

    async def _hide_channel(
        self,
        channel: (discord.TextChannel
                  | discord.ForumChannel
                  | discord.VoiceChannel
                  | discord.StageChannel),
        actor: discord.Member,
    ) -> bool:

        guild = channel.guild

        if await has_channel_snapshots(
                guild.id,
                channel.id,
        ):
            return False

        await snapshot_channel_permissions(
            channel,
            [
                "view_channel",
            ],
        )

        await apply_channel_permissions(
            channel,
            {
                "view_channel": False,
            },
            reason=f"Hidden by {actor}",
        )

        return True

    async def _unhide_channel(
        self,
        channel: (discord.TextChannel
                  | discord.ForumChannel
                  | discord.VoiceChannel
                  | discord.StageChannel),
        actor: discord.Member,
    ) -> bool:

        return await restore_channel_permissions(
            channel,
            reason=f"Unhidden by {actor}",
        )

    @commands.command(name="hide", )
    async def hide(
        self,
        ctx: commands.Context,
    ):

        channel = ctx.channel

        if not isinstance(
                channel,
                SUPPORTED_CHANNELS,
        ):
            return

        actor = ctx.author

        if not isinstance(
                actor,
                discord.Member,
        ):
            return

        success = await self._hide_channel(
            channel,
            actor,
        )

        if not success:

            await self._reply(
                ctx,
                title="Already Hidden",
                description=(f"{EMOJIS['warning']} "
                             "This channel is already hidden."),
                level="WARNING",
            )

            return

        await self._reply(
            ctx,
            title="Channel Hidden",
            description=(f"{EMOJIS['announcement']} "
                         f"{channel.mention} hidden by "
                         f"{actor.mention}."),
            level="WARNING",
        )

    @commands.command(name="unhide", )
    async def unhide(
        self,
        ctx: commands.Context,
    ):

        channel = ctx.channel

        if not isinstance(
                channel,
                SUPPORTED_CHANNELS,
        ):
            return

        actor = ctx.author

        if not isinstance(
                actor,
                discord.Member,
        ):
            return

        success = await self._unhide_channel(
            channel,
            actor,
        )

        if not success:

            await self._reply(
                ctx,
                title="Not Hidden",
                description=(f"{EMOJIS['warning']} "
                             "This channel is not hidden."),
                level="WARNING",
            )

            return

        await self._reply(
            ctx,
            title="Channel Unhidden",
            description=(f"{EMOJIS['success']} "
                         f"{channel.mention} unhidden by "
                         f"{actor.mention}."),
            level="SUCCESS",
        )


async def setup(bot: commands.Bot, ):

    await bot.add_cog(Hide(bot), )
