import discord
from discord.ext import commands


# ─────────────────────────────────────
# AVATAR BUTTON VIEW
# ─────────────────────────────────────
class AvatarView(discord.ui.View):

    def __init__(
        self,
        *,
        global_url: str | None,
        server_url: str | None,
    ):
        super().__init__(timeout=60)

        if global_url:
            self.add_item(
                discord.ui.Button(
                    label="Global Avatar",
                    style=discord.ButtonStyle.link,
                    url=global_url,
                ))

        if server_url:
            self.add_item(
                discord.ui.Button(
                    label="Server Avatar",
                    style=discord.ButtonStyle.link,
                    url=server_url,
                ))


# ─────────────────────────────────────
# AVATAR COMMAND (PREFIX ONLY)
# ─────────────────────────────────────
class Avatar(commands.Cog):

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @commands.command(
        name="avatar",
        aliases=["av"],
        help="Show the avatar of a user",
    )
    async def avatar(
        self,
        ctx: commands.Context,
        user: discord.Member | discord.User | None = None,
    ):
        if ctx.guild is None:
            return

        target = user or ctx.author

        # Resolve member for guild avatar
        member: discord.Member | None = None
        if isinstance(target, discord.Member):
            member = target
        else:
            member = ctx.guild.get_member(target.id)

        global_avatar = target.avatar.url if target.avatar else None
        server_avatar = (member.guild_avatar.url
                         if member and member.guild_avatar else None)

        # ── Embed
        embed = discord.Embed(
            title="🖼️ Avatar",
            description=f"Showing avatar for {target.mention}",
            color=discord.Color.blurple(),
        )

        # Prefer server avatar
        if server_avatar:
            embed.set_image(url=server_avatar)
        elif global_avatar:
            embed.set_image(url=global_avatar)
        else:
            embed.description += "\n\n❌ This user has no avatar."

        embed.set_footer(text=f"Requested by {ctx.author}")

        # ── Buttons (only if something exists)
        view = None
        if global_avatar or server_avatar:
            view = AvatarView(
                global_url=global_avatar,
                server_url=server_avatar,
            )

        await ctx.send(embed=embed, view=view)

        # ── Clean UX: delete command message
        try:
            await ctx.message.delete()
        except (discord.Forbidden, discord.NotFound):
            pass


async def setup(bot: commands.Bot):
    await bot.add_cog(Avatar(bot))
