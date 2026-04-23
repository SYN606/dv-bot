import discord
from discord.ext import commands
from typing import Optional

from utils.core.embeds import make_embed
from utils.core.emojis import EMOJIS
from db.db_helpers.afk import set_afk, remove_afk

AFK_PREFIX = "[AFK] "


class AFK(commands.Cog):

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    # =====================================================
    # SET AFK
    # =====================================================
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

        # ctx.author is guaranteed Member in guild
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

    # =====================================================
    # AFK RESET
    # =====================================================
    @commands.command(name="afkreset", help="Reset AFK status")
    async def afkreset(
        self,
        ctx: commands.Context,
        member: Optional[discord.Member] = None,
    ) -> None:

        if ctx.guild is None:
            return

        # SELF RESET
        if member is None:
            if not isinstance(ctx.author, discord.Member):
                return
            member = ctx.author
            is_self = True
        else:
            is_self = member.id == ctx.author.id

        # PERMISSION CHECK
        if not is_self:
            if not isinstance(ctx.author, discord.Member):
                return

            if not ctx.author.guild_permissions.manage_guild:
                embed = make_embed(
                    title="Permission Denied",
                    description=
                    f"{EMOJIS['error']} You can't reset others' AFK.",
                    level="ERROR",
                )
                await ctx.send(embed=embed)
                return

        # REMOVE AFK
        removed = await remove_afk(ctx.guild.id, member.id)

        if not removed:
            embed = make_embed(
                title="AFK Reset",
                description=f"{EMOJIS['warning']} {member.mention} is not AFK.",
                level="WARNING",
            )
            await ctx.send(embed=embed)
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
        if is_self:
            desc = f"{EMOJIS['okay']} Your AFK has been cleared."
        else:
            desc = (f"{EMOJIS['okay']} Cleared AFK for {member.mention}\n"
                    f"{EMOJIS['arrow_point']} Reason was: {removed.reason}")

        embed = make_embed(
            title="AFK Reset",
            description=desc,
            level="SUCCESS",
        )

        await ctx.send(embed=embed)


# =====================================================
# SETUP
# =====================================================
async def setup(bot: commands.Bot):
    await bot.add_cog(AFK(bot))
