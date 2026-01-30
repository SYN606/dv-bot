import discord
from discord.ext import commands
from discord import app_commands

from utils.embeds import make_embed


class Ping(commands.Cog):

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @app_commands.command(
        name="ping", description="Check bot latency and connection status")
    async def ping(self, interaction: discord.Interaction):
        latency_ms = round(self.bot.latency * 1000)

        embed = make_embed(title="Pong",
                           description="Bot connection diagnostics",
                           level="DEBUG",
                           fields=[
                               ("Gateway Latency", f"{latency_ms} ms", True),
                               ("Status", "Online", True),
                           ],
                           footer=f"Requested by {interaction.user}")

        await interaction.response.send_message(embed=embed)


async def setup(bot: commands.Bot):
    await bot.add_cog(Ping(bot))
