import discord
from discord.ext import commands
import time

from utils.core.embeds import make_embed
from utils.views.base_media_view import BaseMediaView

# per-guild global cooldown tracking
_global_last_used: dict[int, float] = {}

GLOBAL_COOLDOWN_DEFAULT = 2
GUILD_COOLDOWNS: dict[int, float] = {}


class Avatar(commands.Cog):

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @commands.command(name="avatar", aliases=["av"], help="Display avatar")
    @commands.dynamic_cooldown(
        lambda ctx: None if isinstance(ctx.author, discord.Member) and ctx.
        author.guild_permissions.manage_guild else commands.Cooldown(2, 5),
        commands.BucketType.user,
    )
    async def avatar(
        self,
        ctx: commands.Context,
        user: discord.Member | discord.User | None = None,
    ) -> None:

        guild_id = ctx.guild.id if ctx.guild else 0

        # resolve cooldown
        guild_cd = GUILD_COOLDOWNS.get(guild_id, GLOBAL_COOLDOWN_DEFAULT)

        now = time.time()
        last_used = _global_last_used.get(guild_id, 0)
        remaining = guild_cd - (now - last_used)

        if remaining > 0:
            await ctx.reply(
                embed=make_embed(
                    title="Cooldown",
                    description=
                    f"Please wait **{remaining:.1f}s** before using this command again.",
                    level="WARNING",
                ),
                mention_author=False,
            )
            return

        _global_last_used[guild_id] = now

        # resolve target
        target = user or ctx.author

        # resolve member
        member = ctx.guild.get_member(target.id) if ctx.guild else None

        # avatar resolution
        global_avatar = target.display_avatar.url
        server_avatar = (member.guild_avatar.url
                         if member and member.guild_avatar else None)

        # both avatars (toggle)
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
            message = await ctx.send(embed=embed, view=view)
            view.message = message

        else:
            # single avatar
            embed = make_embed(
                title="User Avatar",
                description=target.mention,
                level="INFO",
            )
            embed.set_image(url=global_avatar)

            await ctx.send(embed=embed)

        # cleanup
        try:
            await ctx.message.delete()
        except discord.HTTPException:
            pass

    @avatar.error
    async def avatar_error(self, ctx: commands.Context, error):

        if isinstance(error, commands.CommandOnCooldown):
            await ctx.reply(
                embed=make_embed(
                    title="Cooldown",
                    description=
                    f"Try again in **{round(error.retry_after, 1)}s**.",
                    level="WARNING",
                ),
                mention_author=False,
            )


async def setup(bot: commands.Bot):
    await bot.add_cog(Avatar(bot))
