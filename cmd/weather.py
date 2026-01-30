import discord
from discord.ext import commands
from discord import app_commands

from utils.embeds import make_embed


class Weather(commands.Cog):

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @app_commands.command(
        name="weather",
        description="Get current weather information for a location")
    @app_commands.describe(location="City or location name (optional)")
    async def weather(self,
                      interaction: discord.Interaction,
                      location: str | None = None):
        embed = make_embed(
            title="Weather",
            description=
            ("Weather functionality is not yet enabled.\n"
             "This command will provide real-time weather data in a future update."
             ),
            level="SYSTEM",
            fields=[("Location", location if location else "Not specified",
                     True), ("Status", "Coming soon", True)],
            footer=f"Requested by {interaction.user}")

        await interaction.response.send_message(embed=embed)


async def setup(bot: commands.Bot):
    await bot.add_cog(Weather(bot))
