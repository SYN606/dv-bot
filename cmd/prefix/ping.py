import time
import discord
from discord.ext import commands

from utils.embeds import make_embed
from utils.emojis import EMOJIS


class Ping(commands.Cog):
    """
    Diagnostics and health-check commands.
    """

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @commands.command(
        name="ping",
        help="Display bot latency and connection status",
    )
    async def ping(self, ctx: commands.Context) -> None:

        # Measure API round-trip latency
        start = time.perf_counter()
        message = await ctx.send("🏓 Pinging...")
        api_latency = round((time.perf_counter() - start) * 1000)

        gateway_latency = round(self.bot.latency * 1000)

        # Status logic
        overall = max(api_latency, gateway_latency)

        if overall < 250:
            status_text = f"{EMOJIS['green_dot']} Excellent"
        elif overall < 500:
            status_text = f"{EMOJIS['success']} Good"
        else:
            status_text = f"{EMOJIS['warning']} High latency"

        embed = make_embed(
            title="Connection Status",
            description=(
                f"{EMOJIS['success']} The bot is online and responding.\n\n"
                f"{EMOJIS['arrow_point']} Live connection metrics:"),
            level="INFO",
            fields=[
                ("📡 Gateway Latency", f"`{gateway_latency} ms`", True),
                ("🌐 API Latency", f"`{api_latency} ms`", True),
                ("⚙️ Status", status_text, True),
            ],
            footer="System diagnostics • ping",
        )

        await message.edit(content=None, embed=embed)

        # Delete user message in background (non-blocking)
        try:
            ctx.bot.loop.create_task(ctx.message.delete())
        except Exception:
            pass


async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(Ping(bot))
