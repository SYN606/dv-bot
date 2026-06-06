import discord
from discord.ext import commands
from utils.permissions.base_admin import BaseAdminCog
from utils.core.embeds import make_embed
from utils.core.emojis import EMOJIS
from utils.handlers.vc_mod_handlers.drag_handler import drag_member


class VCDrag(BaseAdminCog):

    def __init__(self, bot: commands.Bot):
        super().__init__()
        self.bot = bot

    async def _cleanup(self, ctx: commands.Context):
        if ctx.interaction:
            return
        try:
            await ctx.message.delete()
        except (discord.Forbidden, discord.NotFound, discord.HTTPException):
            pass

    @commands.hybrid_command(name="drag",
                             description="Move a member to another VC.")
    @commands.cooldown(2, 10, commands.BucketType.guild)
    async def drag(self, ctx: commands.Context, member: discord.Member,
                   channel: discord.VoiceChannel):
        author = ctx.author
        guild = ctx.guild

        if guild is None or not isinstance(author, discord.Member):
            return

        # Target not connected
        if not member.voice or not member.voice.channel:
            embed = make_embed(
                title=f"{EMOJIS.get('fail', '❌')} User Not Connected",
                description=f"{member.mention} is not in a voice channel.",
                level="ERROR")
            embed.set_footer(text=f"Action by : {author}",
                             icon_url=author.display_avatar.url)
            await ctx.send(embed=embed)
            return

        # Same VC
        if member.voice.channel.id == channel.id:
            embed = make_embed(
                title=f"{EMOJIS.get('warning', '⚠️')} Same Voice Channel",
                description=
                f"{member.mention} is already in {channel.mention}.",
                level="WARNING")
            embed.set_footer(text=f"Action by : {author}",
                             icon_url=author.display_avatar.url)
            await ctx.send(embed=embed)
            return

        # Prevent self drag
        if member.id == author.id:
            embed = make_embed(
                title=f"{EMOJIS.get('warning', '⚠️')} Invalid Target",
                description="You cannot drag yourself.",
                level="WARNING")
            embed.set_footer(text=f"Action by : {author}",
                             icon_url=author.display_avatar.url)
            await ctx.send(embed=embed)
            return

        # Moderator permissions check
        if not channel.permissions_for(author).move_members:
            embed = make_embed(
                title=f"{EMOJIS.get('fail', '❌')} Missing Permissions",
                description=
                "You do not have permission to move members into this VC.",
                level="ERROR")
            embed.set_footer(text=f"Action by : {author}",
                             icon_url=author.display_avatar.url)
            await ctx.send(embed=embed)
            return

        # Bot permissions check
        bot_member = guild.me
        if not bot_member or not channel.permissions_for(
                bot_member).move_members:
            embed = make_embed(
                title=f"{EMOJIS.get('fail', '❌')} Bot Missing Permissions",
                description=
                "I do not have permission to move members inside this channel.",
                level="ERROR")
            embed.set_footer(text=f"Action by : {author}",
                             icon_url=author.display_avatar.url)
            await ctx.send(embed=embed)
            return

        # Execute Drag Action
        if await drag_member(member, channel):
            embed = make_embed(
                title=f"{EMOJIS.get('success', '✅')} Member Dragged",
                description=
                f"{EMOJIS.get('arrow_point', '➡️')} {member.mention} was moved to {channel.mention}",
                level="SUCCESS")
            embed.set_footer(text=f"Action by : {author}",
                             icon_url=author.display_avatar.url)
            await ctx.send(embed=embed)
        else:
            embed = make_embed(
                title=f"{EMOJIS.get('fail', '❌')} Drag Failed",
                description=
                "Unable to move member. Check connection or system state.",
                level="ERROR")
            embed.set_footer(text=f"Action by : {author}",
                             icon_url=author.display_avatar.url)
            await ctx.send(embed=embed)

        # Cleanup text invocation safely if necessary
        await self._cleanup(ctx)

    # Error handling pipeline
    @drag.error
    async def drag_error(self, ctx: commands.Context,
                         error: commands.CommandError):
        if isinstance(error, commands.CommandOnCooldown):
            embed = make_embed(
                title=f"{EMOJIS.get('warning', '⚠️')} Command On Cooldown",
                description=
                f"Please wait `{error.retry_after:.1f}s` before using this command again.",
                level="WARNING")
            embed.set_footer(text=f"Action by : {ctx.author}",
                             icon_url=ctx.author.display_avatar.url)
            await ctx.send(embed=embed)
        elif isinstance(error, commands.CheckFailure):
            pass


async def setup(bot: commands.Bot):
    await bot.add_cog(VCDrag(bot))
