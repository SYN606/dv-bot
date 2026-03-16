import discord
from discord.ext import commands

from utils.embeds import make_embed
from utils.views.base_media_view import BaseMediaView


class Avatar(commands.Cog):

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

        # Resolve guild member safely
        member = ctx.guild.get_member(target.id)

        # Real global avatar
        global_avatar = (target.avatar.url
                         if target.avatar else target.display_avatar.url)

        # Server avatar (if exists)
        server_avatar = (member.guild_avatar.url
                         if member and member.guild_avatar else None)

        # ─────────────────────────
        # Toggle view if server avatar exists
        # ─────────────────────────
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

            embed = make_embed(
                title="User Avatar",
                description=f"Avatar for {target.mention}.",
                level="INFO",
                footer=f"Requested by {ctx.author}",
            )

            embed.set_image(url=global_avatar)

            await ctx.send(embed=embed)

        # delete invoking message silently
        try:
            ctx.bot.loop.create_task(ctx.message.delete())
        except Exception:
            pass


async def setup(bot: commands.Bot):
    await bot.add_cog(Avatar(bot))
