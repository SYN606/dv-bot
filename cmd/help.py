import discord
from discord.ext import commands
from discord import app_commands

from utils.embeds import make_embed


class Help(commands.Cog):

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @app_commands.command(
        name="help",
        description="Show available commands and usage information")
    async def help(self, interaction: discord.Interaction):
        embed = make_embed(
            title="Help",
            description="Available slash commands",
            level="INFO",
            fields=[
                (
                    "General",
                    "`/ping` – Check bot latency\n"
                    "`/help` – Show this help message",
                    False,
                ),
                (
                    "AFK",
                    "`/afk [reason]` – Mark yourself as AFK",
                    False,
                ),
                (
                    "Roles",
                    "`/addrole <member> <role>` – Add a role (admin only)\n"
                    "`/removerole <member> <role>` – Remove a role (admin only)",
                    False,
                ),
                (
                    "Utilities",
                    "`/weather [location]` – Weather information (coming soon)",
                    False,
                ),
            ],
            footer="Use slash commands to interact with the bot")

        await interaction.response.send_message(embed=embed)


async def setup(bot: commands.Bot):
    await bot.add_cog(Help(bot))
