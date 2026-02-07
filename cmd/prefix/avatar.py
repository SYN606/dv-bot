import discord
from discord.ext import commands

from utils.embeds import make_embed
from utils.views.avatar_view import AvatarView


class Avatar(commands.Cog):
    """
    User avatar inspection commands.

    Displays a user's avatar intelligently:
    - Shows a single avatar when only one exists
    - Attaches interactive controls only when multiple distinct avatars exist
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

        try:
            if ctx.guild is None:
                return

            target = user or ctx.author

            # ── Resolve member for guild avatar
            member: discord.Member | None = (target if isinstance(
                target, discord.Member) else ctx.guild.get_member(target.id))

            global_avatar: str | None = (target.avatar.url
                                         if target.avatar else None)
            server_avatar: str | None = (member.guild_avatar.url if member
                                         and member.guild_avatar else None)

            # ─────────────────────────────
            # No avatars available
            # ─────────────────────────────
            if not global_avatar and not server_avatar:
                embed = make_embed(
                    title="User Avatar",
                    description=(
                        f"{target.mention} does not have an avatar configured."
                    ),
                    level="WARNING",
                    footer=f"Requested by {ctx.author}",
                )

                await ctx.send(embed=embed)
                return

            # ─────────────────────────────
            # Determine avatar strategy
            # ─────────────────────────────
            avatars_are_distinct = (global_avatar and server_avatar
                                    and global_avatar != server_avatar)

            # ─────────────────────────────
            # Base embed
            # ─────────────────────────────
            embed = make_embed(
                title="User Avatar",
                description=f"Avatar for {target.mention}.",
                level="INFO",
                footer=f"Requested by {ctx.author}",
            )

            # Prefer server avatar visually
            embed.set_image(url=server_avatar or global_avatar)

            # ─────────────────────────────
            # Conditional v2 interactive component
            # ─────────────────────────────
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

        finally:
            # ─────────────────────────────
            # Guaranteed command cleanup
            # ─────────────────────────────
            try:
                await ctx.message.delete()
            except (discord.Forbidden, discord.NotFound):
                pass


async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(Avatar(bot))
