import discord
from discord.ext import commands

from utils.embeds import make_embed
from utils.views.avatar_view import AvatarView


class Avatar(commands.Cog):
    """
    Prefix avatar command (snappy + optimised).
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

        # Resolve member for guild avatar
        member = (target if isinstance(target, discord.Member) else
                  ctx.guild.get_member(target.id))

        # Use display_avatar for speed & fallback safety
        global_avatar = target.display_avatar.url
        server_avatar = (member.guild_avatar.url
                         if member and member.guild_avatar else None)

        avatars_are_distinct = (server_avatar and global_avatar
                                and server_avatar != global_avatar)

        embed = make_embed(
            title="User Avatar",
            description=f"Avatar for {target.mention}.",
            level="INFO",
            footer=f"Requested by {ctx.author}",
        )

        embed.set_image(url=server_avatar or global_avatar)

        # SEND IMMEDIATELY (no blocking logic before)
        if avatars_are_distinct:
            view = AvatarView(
                requester_id=ctx.author.id,
                global_url=global_avatar,
                server_url=server_avatar,
                active="server",
            )
            message = await ctx.send(embed=embed, view=view)
            view.message = message
        else:
            await ctx.send(embed=embed)

        # Delete command message in background (non-blocking)
        try:
            ctx.bot.loop.create_task(ctx.message.delete())
        except Exception:
            pass


async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(Avatar(bot))
