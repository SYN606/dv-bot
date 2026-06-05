import time
import discord
from discord.ext import commands
from utils.core.embeds import make_embed
from utils.views.base_media_view import BaseMediaView

# Per-guild global cooldown tracking
_global_last_used: dict[int, float] = {}
GLOBAL_COOLDOWN_DEFAULT = 2
GUILD_COOLDOWNS: dict[int, float] = {}


class Avatar(commands.Cog):

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @commands.hybrid_command(
        name="avatar",
        aliases=["av", "pfp"],
        description="Display the global or server avatar of a user.")
    @commands.dynamic_cooldown(
        lambda ctx: None if isinstance(ctx.author, discord.Member) and ctx.
        author.guild_permissions.manage_guild else commands.Cooldown(1, 3),
        commands.BucketType.user,
    )
    async def avatar(
            self,
            ctx: commands.Context,
            user: discord.Member | discord.User | None = None) -> None:
        guild_id = ctx.guild.id if ctx.guild else 0

        # Resolve Guild-wide Custom Cooldown Restrictions
        guild_cd = GUILD_COOLDOWNS.get(guild_id, GLOBAL_COOLDOWN_DEFAULT)
        remaining = guild_cd - (time.time() -
                                _global_last_used.get(guild_id, 0))

        if remaining > 0:
            await ctx.reply(embed=make_embed(
                title="Cooldown Active",
                description=
                f"Please wait **{remaining:.1f}s** before running this command again.",
                level="WARNING",
            ),
                            mention_author=False,
                            ephemeral=True)
            return

        _global_last_used[guild_id] = time.time()

        # Resolve Targets & Avatars
        target = user or ctx.author
        member = ctx.guild.get_member(target.id) if ctx.guild else None

        global_avatar = target.display_avatar.url
        server_avatar = member.guild_avatar.url if member and member.guild_avatar else None

        # Build Interactive View Component if alternative avatar paths exist
        if server_avatar:
            view = BaseMediaView(
                requester_id=ctx.author.id,
                requester_name=str(ctx.author),
                global_url=global_avatar,
                server_url=server_avatar,
                active="server",
                title="User Avatar",
                server_label="Server Avatar",
                global_label="Global Avatar",
            )
            embed = view.build_embed()
            embed.set_footer(text=f"Requested by: {ctx.author}",
                             icon_url=ctx.author.display_avatar.url)

            message = await ctx.send(embed=embed, view=view)
            view.message = message
        else:
            embed = make_embed(title="User Avatar",
                               description=target.mention,
                               level="INFO")
            embed.set_image(url=global_avatar)
            embed.set_footer(text=f"Requested by: {ctx.author}",
                             icon_url=ctx.author.display_avatar.url)

            await ctx.send(embed=embed)

        # Cleanup original invoke content gracefully (Prefix Only)
        if ctx.interaction is None:
            try:
                await ctx.message.delete()
            except (discord.HTTPException, discord.Forbidden):
                pass

    @avatar.error
    async def avatar_error(self, ctx: commands.Context,
                           error: commands.CommandError):
        if isinstance(error, commands.CommandOnCooldown):
            await ctx.reply(embed=make_embed(
                title="User Cooldown",
                description=
                f"Slow down. Try again in **{error.retry_after:.1f}s**.",
                level="WARNING",
            ),
                            mention_author=False,
                            ephemeral=True)


async def setup(bot: commands.Bot):
    await bot.add_cog(Avatar(bot))
