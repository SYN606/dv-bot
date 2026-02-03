import discord
from discord.ext import commands

from utils.embeds import make_embed
from utils.emojis import EMOJIS


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
            title="Pong 🏓",
            description=(
                f"{EMOJIS['ping']} Connection stable hai, tension mat lo.\n"
                f"{EMOJIS['green_dot']} Bot zinda hai, kaam pe laga hua hai."),
            level="INFO",
            fields=[
                ("Gateway latency", f"{latency_ms} ms", True),
                ("Status", "Online", True),
            ],
            footer="Digital Vigital diagnostics",
        )

        # ONE send path for both slash & prefix
        await ctx.send(embed=embed)

        # Optional: delete prefix invocation message
        if ctx.interaction is None:
            try:
                await ctx.message.delete()
            except (discord.Forbidden, discord.NotFound):
                pass


async def setup(bot: commands.Bot):
    await bot.add_cog(Ping(bot))
