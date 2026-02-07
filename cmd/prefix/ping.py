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
        latency_ms = round(self.bot.latency * 1000)

        # Dynamic status hint
        status_text = (f"{EMOJIS['green_dot']} Operational" if latency_ms < 300
                       else f"{EMOJIS['warning']} High latency")

        embed = make_embed(
            title="Connection Status",
            description=
            (f"{EMOJIS['success']} The bot is online and responding normally.\n\n"
             f"{EMOJIS['arrow_point']} Live connection metrics:"),
            level="INFO",
            fields=[
                ("📡 Gateway Latency", f"`{latency_ms} ms`", True),
                ("⚙️ Status", status_text, True),
            ],
            footer="System diagnostics • ping",
        )

        await ctx.send(embed=embed)

        # Clean UX for prefix command
        try:
            await ctx.message.delete()
        except (discord.Forbidden, discord.NotFound):
            pass


async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(Ping(bot))
