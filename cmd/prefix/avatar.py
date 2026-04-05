import discord
from discord.ext import commands

from utils.core.embeds import make_embed
from utils.views.base_media_view import BaseMediaView


class Avatar(commands.Cog):

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    # =====================================================
    # COMMAND
    # =====================================================
    @commands.command(
        name="avatar",
        aliases=["av"],
        help="Display the avatar of a user",
    )
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

        target = user or ctx.author

        # =====================================================
        # RESOLVE MEMBER (SAFE)
        # =====================================================
        member: discord.Member | None = None
        if ctx.guild:
            member = ctx.guild.get_member(target.id)

        # =====================================================
        # AVATAR RESOLUTION
        # =====================================================
        global_avatar = (target.avatar.url
                         if target.avatar else target.display_avatar.url)

        server_avatar = (member.guild_avatar.url
                         if member and member.guild_avatar else None)

        # =====================================================
        # WITH TOGGLE VIEW
        # =====================================================
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

        # =====================================================
        # SIMPLE VIEW
        # =====================================================
        else:

            embed = make_embed(
                title="User Avatar",
                description=f"Avatar for {target.mention}.",
                level="INFO",
                footer=f"Requested by {ctx.author}",
            )

            embed.set_image(url=global_avatar)

            await ctx.send(embed=embed)

        # =====================================================
        # CLEANUP
        # =====================================================
        try:
            await ctx.message.delete()
        except discord.HTTPException:
            pass

    # =====================================================
    # ERROR HANDLER (COOLDOWN)
    # =====================================================
    @avatar.error
    async def avatar_error(self, ctx: commands.Context, error):

        if isinstance(error, commands.CommandOnCooldown):
            await ctx.send(embed=make_embed(
                title="Cooldown Active",
                description=f"Try again in **{round(error.retry_after, 1)}s**.",
                level="WARNING",
            ))


async def setup(bot: commands.Bot):
    await bot.add_cog(Avatar(bot))
