import time
from discord.ext import commands

from utils.core.embeds import make_embed
from utils.core.emojis import EMOJIS


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

        # Initial placeholder
        message = await ctx.send(embed=make_embed(
            title="Pinging...",
            description=f"{EMOJIS['loading']} Measuring connection latency...",
            level="DEBUG",
            show_timestamp=False,
        ))

        # Measure API latency
        start = time.perf_counter()
        await message.edit(embed=make_embed(
            title="Calculating...",
            description=f"{EMOJIS['loading']} Gathering diagnostics...",
            level="DEBUG",
            show_timestamp=False,
        ))
        api_latency = round((time.perf_counter() - start) * 1000)

        # Gateway latency
        gateway_latency = round(self.bot.latency * 1000)

        overall = max(api_latency, gateway_latency)

        # Status determination
        if overall < 200:
            status_text = f"{EMOJIS['green_dot']} Excellent"
        elif overall < 400:
            status_text = f"{EMOJIS['success']} Good"
        else:
            status_text = f"{EMOJIS['warning']} High latency"

        embed = make_embed(
            title="Connection Status",
            description=(
                f"{EMOJIS['success']} Bot is online and responding.\n\n"
                f"{EMOJIS['arrow_point']} Live connection metrics:"),
            level="INFO",
            fields=[
                ("Gateway Latency", f"`{gateway_latency} ms`", True),
                ("API Latency", f"`{api_latency} ms`", True),
                ("Status", status_text, True),
            ],
            footer="System diagnostics • ping",
        )

        await message.edit(embed=embed)

        # Delete invoking message silently
        try:
            ctx.bot.loop.create_task(ctx.message.delete())
        except Exception:
            pass


async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(Ping(bot))
