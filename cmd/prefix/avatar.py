import discord
from discord.ext import commands

from utils.views.avatar_view import AvatarView


class Avatar(commands.Cog):
    """
    Prefix avatar command.
    Displays global and server avatars with toggle support.
    """

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @commands.command(
        name="avatar",
        aliases=["av"],
        help="Display the avatar of a user",
    )
    async def avatar(
        self,
        ctx: commands.Context,
        user: discord.Member | discord.User | None = None,
    ) -> None:

        if ctx.guild is None:
            return

        target = user or ctx.author

        # Resolve guild member for server avatar
        member = (target if isinstance(target, discord.Member) else
                  ctx.guild.get_member(target.id))

        # Global avatar (always exists)
        global_avatar = target.display_avatar.url

        # Server avatar (if user has one)
        server_avatar = (member.guild_avatar.url
                         if member and member.guild_avatar else None)

        # Check if both avatars exist and differ
        avatars_are_distinct = (server_avatar and global_avatar
                                and server_avatar != global_avatar)

        # ─────────────────────────
        # Use AvatarView
        # ─────────────────────────
        if avatars_are_distinct:

            view = AvatarView(
                requester_id=ctx.author.id,
                global_url=global_avatar,
                server_url=server_avatar,
                active="server",
            )

            embed = view.build_embed()

            message = await ctx.send(embed=embed, view=view)
            view.message = message

        else:
            # No toggle needed
            embed = discord.Embed(
                title="User Avatar",
                description=f"Avatar for {target.mention}.",
            )

            embed.set_image(url=server_avatar or global_avatar)

            await ctx.send(embed=embed)

        # Delete invoking message (non-blocking)
        try:
            ctx.bot.loop.create_task(ctx.message.delete())
        except Exception:
            pass


async def setup(bot: commands.Bot):
    await bot.add_cog(Avatar(bot))
