import discord
from discord.ext import commands
from typing import Optional

from utils.core.embeds import make_embed
from utils.core.emojis import EMOJIS
from utils.permissions.check_perms import is_bot_admin_ctx
from db.db_helpers.afk import set_afk, remove_afk

AFK_PREFIX = "[AFK] "


class AFK(commands.Cog):

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    async def _cleanup(self, ctx: commands.Context):
        if ctx.interaction:
            return
        try:
            await ctx.message.delete()
        except (discord.Forbidden, discord.NotFound, discord.HTTPException):
            pass

    @commands.group(name="afk",
                    invoke_without_command=True,
                    help="Mark yourself as AFK")
    @commands.guild_only()
    async def afk(self,
                  ctx: commands.Context,
                  *,
                  afk_reason: str = "AFK") -> None:
        if ctx.guild is None:
            return

        author = ctx.author
        afk_reason = afk_reason.strip() or "AFK"
        afk_reason = afk_reason[:200]

        await set_afk(ctx.guild.id, author.id, afk_reason)

        if isinstance(author, discord.Member):
            try:
                if ctx.guild.me.guild_permissions.manage_nicknames:
                    if not author.display_name.startswith(AFK_PREFIX):
                        new_name = f"{AFK_PREFIX}{author.display_name}"
                        if len(new_name) <= 32:
                            await author.edit(nick=new_name)
            except Exception:
                pass

        embed = make_embed(
            title="AFK Enabled",
            description=(
                f"{EMOJIS.get('okay', '👌')} {author.mention} is now AFK.\n"
                f"{EMOJIS.get('arrow_point', '➡️')} Reason: {afk_reason}"),
            level="SUCCESS",
        )
        embed.set_footer(text=f"Action by : {author}",
                         icon_url=author.display_avatar.url)
        await ctx.send(embed=embed)

        await self._cleanup(ctx)

    @afk.command(name="reset", help="Reset AFK status of a server user")
    @commands.guild_only()
    async def afk_reset(self,
                        ctx: commands.Context,
                        member: Optional[discord.Member] = None) -> None:
        if ctx.guild is None:
            return

        author = ctx.author

        if member is None:
            embed = make_embed(
                title="Invalid Usage",
                description="Correct Usage: `afk reset @user`",
                level="WARNING",
            )
            embed.set_footer(text=f"Action by : {author}",
                             icon_url=author.display_avatar.url)
            await ctx.send(embed=embed)
            return

        if member.id == author.id:
            embed = make_embed(
                title="Invalid Action",
                description=
                "You cannot reset your own AFK manually via this command structure.",
                level="WARNING",
            )
            embed.set_footer(text=f"Action by : {author}",
                             icon_url=author.display_avatar.url)
            await ctx.send(embed=embed)
            return

        if not isinstance(author, discord.Member):
            return

        is_allowed = (author.id == ctx.guild.owner_id
                      or author.guild_permissions.administrator
                      or await is_bot_admin_ctx(ctx))

        if not is_allowed:
            embed = make_embed(
                title="Permission Denied",
                description=
                "You do not have enough system authority to clear another user's AFK status.",
                level="ERROR",
            )
            embed.set_footer(text=f"Action by : {author}",
                             icon_url=author.display_avatar.url)
            await ctx.send(embed=embed)
            return

        removed = await remove_afk(ctx.guild.id, member.id)

        if not removed:
            embed = make_embed(
                title="AFK Reset Failed",
                description=
                f"{EMOJIS.get('warning', '⚠️')} {member.mention} is not currently marked as AFK.",
                level="WARNING",
            )
            embed.set_footer(text=f"Action by : {author}",
                             icon_url=author.display_avatar.url)
            await ctx.send(embed=embed)
            return

        try:
            if ctx.guild.me.guild_permissions.manage_nicknames:
                if member.display_name.startswith(AFK_PREFIX):
                    new_name = member.display_name.replace(AFK_PREFIX, "", 1)
                    await member.edit(nick=new_name)
        except Exception:
            pass

        embed = make_embed(
            title="AFK Reset Successful",
            description=
            (f"{EMOJIS.get('success', '✅')} Cleared AFK markers for {member.mention}\n"
             f"{EMOJIS.get('arrow_point', '➡️')} Stored Reason was: {getattr(removed, 'afk_reason', 'AFK')}"
             ),
            level="SUCCESS",
        )
        embed.set_footer(text=f"Action by : {author}",
                         icon_url=author.display_avatar.url)
        await ctx.send(embed=embed)

        await self._cleanup(ctx)


async def setup(bot: commands.Bot):
    await bot.add_cog(AFK(bot))
