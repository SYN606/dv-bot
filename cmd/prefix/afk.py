from discord.ext import commands

from utils.embeds import make_embed
from utils.emojis import EMOJIS
from db.db_helpers.afk import set_afk

class AFK(commands.Cog):

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @commands.command(name="afk")
    async def afk(
        self,
        ctx: commands.Context,
        *,
        reason: str = "AFK",
    ):

        if ctx.guild is None:
            return

        reason = reason.strip()[:200]

        await set_afk(
            guild_id=ctx.guild.id,
            user_id=ctx.author.id,
            reason=reason,
        )

        embed = make_embed(
            title="AFK Enabled",
            description=(f"{EMOJIS['okay']} You are now AFK.\n"
                         f"{EMOJIS['arrow_point']} Reason: {reason}"),
            level="SUCCESS",
        )

        await ctx.send(embed=embed)

        try:
            ctx.bot.loop.create_task(ctx.message.delete())
        except Exception:
            pass


async def setup(bot: commands.Bot):
    await bot.add_cog(AFK(bot))
