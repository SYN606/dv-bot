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
            title="Pong",
            description=(
                f"{EMOJIS['ping']} Connection is stable and responsive.\n"
                f"{EMOJIS['green_dot']} Bot is online."),
            level="INFO",
            fields=[
                ("Gateway latency", f"{latency_ms} ms", True),
                ("Status", "Online", True),
            ],
            footer="Digital Vigital diagnostics",
        )

        # Slash command path
        if ctx.interaction:
            await ctx.interaction.response.send_message(embed=embed)
            return

        # Prefix command path
        try:
            await ctx.message.delete()
        except discord.Forbidden:
            pass
        except discord.NotFound:
            pass

        await ctx.send(embed=embed)


async def setup(bot: commands.Bot):
    await bot.add_cog(Ping(bot))
