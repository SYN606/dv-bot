import discord
from discord.ext import commands

from utils.embeds import make_embed


class Ping(commands.Cog):

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @commands.hybrid_command(
        name="ping",
        description="Check bot latency and connection status",
    )
    async def ping(self, ctx: commands.Context):
        latency_ms = round(self.bot.latency * 1000)

        embed = make_embed(
            title="Pong",
            description="Bot connection diagnostics",
            level="INFO",
            fields=[
                ("<a:green_dot:1359633941245722839> Gateway Latency", f"{latency_ms} ms", True),
                ("Status", "Online", True),
            ],
            footer=f"Requested by {ctx.author}",
        )

        # Works for BOTH slash & prefix
        if ctx.interaction:
            await ctx.interaction.response.send_message(embed=embed)
        else:
            await ctx.reply(embed=embed, mention_author=False)


async def setup(bot: commands.Bot):
    await bot.add_cog(Ping(bot))
