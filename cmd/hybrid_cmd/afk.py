from discord.ext import commands
from discord import app_commands

from utils.embeds import make_embed
from db.db_helpers.afk import set_afk


class AFK(commands.Cog):

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @commands.hybrid_command(
        name="afk",
        description="Mark yourself as AFK",
    )
    @app_commands.describe(reason="Reason for going AFK")
    async def afk(self, ctx: commands.Context, *, reason: str = "AFK"):
        if ctx.guild is None:
            return

        set_afk(
            guild_id=ctx.guild.id,
            user_id=ctx.author.id,
            reason=reason,
        )

        embed = make_embed(
            title="AFK Enabled",
            description=f"You are now AFK.\nReason: {reason}",
            level="SUCCESS",
        )

        await ctx.reply(embed=embed, mention_author=False)


async def setup(bot: commands.Bot):
    await bot.add_cog(AFK(bot))
