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
            await ctx.send(embed=make_embed(
                title=f"{EMOJIS['fail']} User Not Connected",
                description=f"{member.mention} is not in a voice channel.",
                level="ERROR"))
            return

        # Same VC
        if member.voice.channel.id == channel.id:
            await ctx.send(embed=make_embed(
                title=f"{EMOJIS['warning']} Same Voice Channel",
                description=
                f"{member.mention} is already in {channel.mention}.",
                level="WARNING"))
            return

        # Prevent self drag
        if member.id == author.id:
            await ctx.send(
                embed=make_embed(title=f"{EMOJIS['warning']} Invalid Target",
                                 description="You cannot drag yourself.",
                                 level="WARNING"))
            return

        # Moderator permissions check
        if not channel.permissions_for(author).move_members:
            await ctx.send(embed=make_embed(
                title=f"{EMOJIS['fail']} Missing Permissions",
                description=
                "You do not have permission to move members into this VC.",
                level="ERROR"))
            return

        # Bot permissions check
        bot_member = guild.me
        if not bot_member or not channel.permissions_for(
                bot_member).move_members:
            await ctx.send(embed=make_embed(
                title=f"{EMOJIS['fail']} Bot Missing Permissions",
                description=
                "I do not have permission to move members inside this channel.",
                level="ERROR"))
            return

        # Execute Drag Action
        if await drag_member(member, channel):
            await ctx.send(embed=make_embed(
                title=f"{EMOJIS['success']} Member Dragged",
                description=
                f"{EMOJIS['arrow_point']} {member.mention} was moved to {channel.mention}",
                level="SUCCESS"))
        else:
            await ctx.send(embed=make_embed(
                title=f"{EMOJIS['fail']} Drag Failed",
                description=
                "Unable to move member. Check connection or system state.",
                level="ERROR"))

    # Error handling pipeline
    @drag.error
    async def drag_error(self, ctx: commands.Context,
                         error: commands.CommandError):
        if isinstance(error, commands.CommandOnCooldown):
            await ctx.send(embed=make_embed(
                title=f"{EMOJIS['warning']} Command On Cooldown",
                description=
                f"Please wait `{error.retry_after:.1f}s` before using this command again.",
                level="WARNING"))
        elif isinstance(error, commands.CheckFailure):
            pass


async def setup(bot: commands.Bot):
    await bot.add_cog(VCDrag(bot))
