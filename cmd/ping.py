from discord.ext import commands
from utils.embeds import basic_embed


class Ping(commands.Cog):

    def __init__(self, bot):
        self.bot = bot

    @commands.command()
    async def ping(self, ctx):
        latency = round(self.bot.latency * 1000)

        embed = basic_embed(title="🏓 Pong!",
                            description=f"Latency: **{latency}ms**")

        await ctx.send(embed=embed)


async def setup(bot):
    await bot.add_cog(Ping(bot))
