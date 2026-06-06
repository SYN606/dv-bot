import discord
from discord.ext import commands
from utils.permissions.base_admin import BaseAdminCog
from utils.core.embeds import make_embed
from utils.core.emojis import EMOJIS
from utils.handlers.vc_mod_handlers.moveall_handler import move_all_members


class VCMoveAll(BaseAdminCog):

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

    @commands.hybrid_command(
        name="moveall",
        aliases=["dragall"],
        description="Move all users between voice channels.")
    @commands.cooldown(1, 15, commands.BucketType.guild)
    @commands.max_concurrency(1, per=commands.BucketType.guild, wait=False)
    async def moveall(self, ctx: commands.Context,
                      source: discord.VoiceChannel,
                      target: discord.VoiceChannel):
        author = ctx.author
        guild = ctx.guild

        if guild is None or not isinstance(author, discord.Member):
            return

        # Same VC Check
        if source.id == target.id:
            embed = make_embed(
                title=f"{EMOJIS.get('warning', '⚠️')} Same Channel",
                description=
                "Source and target voice channels cannot be the same.",
                level="WARNING")
            embed.set_footer(text=f"Action by : {author}",
                             icon_url=author.display_avatar.url)
            await ctx.send(embed=embed)
            return

        # Empty source VC Check
        if not source.members:
            embed = make_embed(
                title=f"{EMOJIS.get('warning', '⚠️')} Empty Voice Channel",
                description="No users found in the source VC.",
                level="WARNING")
            embed.set_footer(text=f"Action by : {author}",
                             icon_url=author.display_avatar.url)
            await ctx.send(embed=embed)
            return

        # Moderator permissions check (Both channels)
        if not source.permissions_for(
                author).move_members or not target.permissions_for(
                    author).move_members:
            embed = make_embed(
                title=f"{EMOJIS.get('fail', '❌')} Missing Permissions",
                description=
                "You do not have permission to move members between these voice channels.",
                level="ERROR")
            embed.set_footer(text=f"Action by : {author}",
                             icon_url=author.display_avatar.url)
            await ctx.send(embed=embed)
            return

        # Bot permissions check (Both channels)
        bot_member = guild.me
        if not bot_member or not source.permissions_for(
                bot_member).move_members or not target.permissions_for(
                    bot_member).move_members:
            embed = make_embed(
                title=f"{EMOJIS.get('fail', '❌')} Bot Missing Permissions",
                description=
                "I do not have permission to move members between these voice channels.",
                level="ERROR")
            embed.set_footer(text=f"Action by : {author}",
                             icon_url=author.display_avatar.url)
            await ctx.send(embed=embed)
            return

        # Execute Bulk Move Action
        moved = await move_all_members(source, target)

        if moved <= 0:
            embed = make_embed(
                title=f"{EMOJIS.get('fail', '❌')} Move Failed",
                description=
                "Unable to move members. Check connectivity or settings.",
                level="ERROR")
            embed.set_footer(text=f"Action by : {author}",
                             icon_url=author.display_avatar.url)
            await ctx.send(embed=embed)
            return

        embed = make_embed(
            title=f"{EMOJIS.get('success', '✅')} Members Moved",
            description=
            f"{EMOJIS.get('arrow_point', '➡️')} Moved `{moved}` users from {source.mention} to {target.mention}",
            level="SUCCESS")
        embed.set_footer(text=f"Action by : {author}",
                         icon_url=author.display_avatar.url)
        await ctx.send(embed=embed)

        # Cleanup text invocation safely if necessary
        await self._cleanup(ctx)

    # Centralized Error Processing Hook
    @moveall.error
    async def moveall_error(self, ctx: commands.Context,
                            error: commands.CommandError):
        author = ctx.author

        if isinstance(error, commands.CommandOnCooldown):
            embed = make_embed(
                title=f"{EMOJIS.get('warning', '⚠️')} Command On Cooldown",
                description=
                f"Please wait `{error.retry_after:.1f}s` before using this command again.",
                level="WARNING")
            embed.set_footer(text=f"Action by : {author}",
                             icon_url=author.display_avatar.url)
            await ctx.send(embed=embed)

        elif isinstance(error, commands.MaxConcurrencyReached):
            embed = make_embed(
                title=f"{EMOJIS.get('warning', '⚠️')} Command Busy",
                description=
                "Another bulk migration operation is already running on this server.",
                level="WARNING")
            embed.set_footer(text=f"Action by : {author}",
                             icon_url=author.display_avatar.url)
            await ctx.send(embed=embed)

        elif isinstance(error, commands.CheckFailure):
            pass


async def setup(bot: commands.Bot):
    await bot.add_cog(VCMoveAll(bot))
