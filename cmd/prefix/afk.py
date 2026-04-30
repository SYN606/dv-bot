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

    # SET AFK
    @commands.command(name="afk", help="Mark yourself as AFK")
    async def afk(
        self,
        ctx: commands.Context,
        *,
        reason: str = "AFK",
    ) -> None:

        if ctx.guild is None:
            return

        reason = reason.strip() or "AFK"
        reason = reason[:200]

        await set_afk(ctx.guild.id, ctx.author.id, reason)

        author = ctx.author
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
            description=(f"{EMOJIS['okay']} {ctx.author.mention} is now AFK.\n"
                         f"{EMOJIS['arrow_point']} Reason: {reason}"),
            level="SUCCESS",
        )

        await ctx.send(embed=embed)

        try:
            await ctx.message.delete()
        except Exception:
            pass

    #  AFK reset system
    @commands.command(name="afkreset", help="Reset AFK of a user")
    @commands.guild_only()
    async def afkreset(
        self,
        ctx: commands.Context,
        member: Optional[discord.Member] = None,
    ) -> None:

        if ctx.guild is None:
            return

        # must provide target
        if member is None:
            await ctx.send(embed=make_embed(
                title="Invalid Usage",
                description="Usage: `afkreset @user`",
                level="WARNING",
            ))
            return

        # prevent self usage
        if member.id == ctx.author.id:
            await ctx.send(embed=make_embed(
                title="Invalid Action",
                description="You cannot reset your own AFK manually.",
                level="WARNING",
            ))
            return

        # permission check
        if not isinstance(ctx.author, discord.Member):
            return

        is_allowed = (ctx.author.id == ctx.guild.owner_id
                      or ctx.author.guild_permissions.administrator
                      or await is_bot_admin_ctx(ctx))

        if not is_allowed:
            await ctx.send(embed=make_embed(
                title="Permission Denied",
                description="You cannot reset others' AFK.",
                level="ERROR",
            ))
            return

        # REMOVE AFK
        removed = await remove_afk(ctx.guild.id, member.id)

        if not removed:
            await ctx.send(embed=make_embed(
                title="AFK Reset",
                description=f"{EMOJIS['warning']} {member.mention} is not AFK.",
                level="WARNING",
            ))
            return

        # RESTORE NICKNAME
        try:
            if ctx.guild.me.guild_permissions.manage_nicknames:
                if member.display_name.startswith(AFK_PREFIX):
                    new_name = member.display_name.replace(AFK_PREFIX, "", 1)
                    await member.edit(nick=new_name)
        except Exception:
            pass

        # RESPONSE
        embed = make_embed(
            title="AFK Reset",
            description=(
                f"{EMOJIS['success']} Cleared AFK for {member.mention}\n"
                f"{EMOJIS['arrow_point']} Reason was: {removed.reason}"),
            level="SUCCESS",
        )

        await ctx.send(embed=embed)


# SETUP
async def setup(bot: commands.Bot):
    await bot.add_cog(AFK(bot))
