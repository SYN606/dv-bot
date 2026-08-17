import discord
from discord.ext import commands

from utils.core.embeds import make_embed
from utils.core.emojis import EMOJIS
from utils.handlers.vc_mod_handlers.drag_handler import drag_member
from utils.permissions.base_admin import BaseAdminCog


class VCDrag(BaseAdminCog):
    """Voice channel moderation cog for dragging members between voice channels."""

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

    @commands.hybrid_command(
        name="drag",
        description="Move a member to another voice channel.",
    )
    @commands.cooldown(2, 10, commands.BucketType.guild)
    async def drag(
        self,
        ctx: commands.Context,
        member: discord.Member,
        channel: discord.VoiceChannel,
    ):
        """Drag a member from their current voice channel to a specified destination channel."""
        author = ctx.author
        guild = ctx.guild

        if guild is None or not isinstance(author, discord.Member):
            return

        footer_text = f"Action by: {author}"
        footer_icon = author.display_avatar.url

        # Target not connected
        if not member.voice or not member.voice.channel:
            embed = make_embed(
                title=f"{EMOJIS['fail']} User Not Connected",
                description=f"{member.mention} is not in a voice channel.",
                level="ERROR",
                footer=footer_text,
                footer_icon=footer_icon,
            )
            await ctx.send(embed=embed)
            return

        # Same VC
        if member.voice.channel.id == channel.id:
            embed = make_embed(
                title=f"{EMOJIS['warning']} Same Voice Channel",
                description=
                f"{member.mention} is already in {channel.mention}.",
                level="WARNING",
                footer=footer_text,
                footer_icon=footer_icon,
            )
            await ctx.send(embed=embed)
            return

        # Prevent self drag
        if member.id == author.id:
            embed = make_embed(
                title=f"{EMOJIS['warning']} Invalid Target",
                description="You cannot drag yourself.",
                level="WARNING",
                footer=footer_text,
                footer_icon=footer_icon,
            )
            await ctx.send(embed=embed)
            return

        # Moderator permissions check
        if not channel.permissions_for(author).move_members:
            embed = make_embed(
                title=f"{EMOJIS['fail']} Missing Permissions",
                description=
                "You do not have permission to move members into this VC.",
                level="ERROR",
                footer=footer_text,
                footer_icon=footer_icon,
            )
            await ctx.send(embed=embed)
            return

        # Bot permissions check
        bot_member = guild.me
        if not bot_member or not channel.permissions_for(
                bot_member).move_members:
            embed = make_embed(
                title=f"{EMOJIS['fail']} Bot Missing Permissions",
                description=
                "I do not have permission to move members inside this channel.",
                level="ERROR",
                footer=footer_text,
                footer_icon=footer_icon,
            )
            await ctx.send(embed=embed)
            return

        # Execute Drag Action
        if await drag_member(member, channel):
            embed = make_embed(
                title=f"{EMOJIS['success']} Member Dragged",
                description=
                f"{EMOJIS['arrow_point']} {member.mention} was moved to {channel.mention}.",
                level="SUCCESS",
                footer=footer_text,
                footer_icon=footer_icon,
            )
            await ctx.send(embed=embed)
        else:
            embed = make_embed(
                title=f"{EMOJIS['fail']} Drag Failed",
                description=
                "Unable to move member. Check connection or system state.",
                level="ERROR",
                footer=footer_text,
                footer_icon=footer_icon,
            )
            await ctx.send(embed=embed)

        await self._cleanup(ctx)

    @drag.error
    async def drag_error(
        self,
        ctx: commands.Context,
        error: commands.CommandError,
    ):
        """Error handler for the drag command."""
        if isinstance(error, commands.CommandOnCooldown):
            embed = make_embed(
                title=f"{EMOJIS['warning']} Command On Cooldown",
                description=
                f"Please wait `{error.retry_after:.1f}s` before using this command again.",
                level="WARNING",
                footer=f"Action by: {ctx.author}",
                footer_icon=ctx.author.display_avatar.url,
            )
            await ctx.send(embed=embed)
        elif isinstance(error, commands.CheckFailure):
            pass


async def setup(bot: commands.Bot):
    await bot.add_cog(VCDrag(bot))
