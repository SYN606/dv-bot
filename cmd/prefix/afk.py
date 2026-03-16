import discord
from discord.ext import commands

from utils.core.embeds import make_embed
from utils.core.emojis import EMOJIS
from db.db_helpers.afk import set_afk


class AFK(commands.Cog):
    """
    AFK system command.
    Marks the user as AFK with an optional reason.
    """

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @commands.command(
        name="afk",
        help="Mark yourself as AFK with an optional reason",
    )
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

        await set_afk(
            guild_id=ctx.guild.id,
            user_id=ctx.author.id,
            reason=reason,
        )

        # Add AFK nickname prefix
        if isinstance(ctx.author, discord.Member):
            try:
                if ctx.guild.me.guild_permissions.manage_nicknames:
                    name = ctx.author.display_name

                    if not name.startswith("[AFK]"):
                        new_name = f"[AFK] {name}"

                        # Discord nickname limit
                        if len(new_name) <= 32:
                            await ctx.author.edit(nick=new_name)

            except Exception:
                pass

        embed = make_embed(
            title="AFK Enabled",
            description=(
                f"{EMOJIS['okay']} {ctx.author.mention} is now marked as AFK.\n"
                f"{EMOJIS['arrow_point']} Reason: {reason}"),
            level="SUCCESS",
        )

        await ctx.send(embed=embed)

        try:
            await ctx.message.delete()
        except Exception:
            pass


async def setup(bot: commands.Bot):
    await bot.add_cog(AFK(bot))
