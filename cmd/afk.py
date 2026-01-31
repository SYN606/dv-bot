import time
import discord
from discord.ext import commands
from discord import app_commands

from utils.embeds import make_embed
from db.db_helpers.afk import set_afk


class AFK(commands.Cog):

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @app_commands.command(name="afk",
                          description="Mark yourself as AFK in this server")
    @app_commands.describe(reason="Reason for going AFK (optional)")
    async def afk(self, interaction: discord.Interaction, reason: str = "AFK"):
        # Slash commands can technically be used in DMs
        if not interaction.guild:
            embed = make_embed(
                title="Invalid Context",
                description="AFK status can only be set inside a server.",
                level="ERROR")
            return await interaction.response.send_message(embed=embed,
                                                           ephemeral=True)

        now = int(time.time())

        set_afk(guild_id=interaction.guild.id,
                user_id=interaction.user.id,
                reason=reason)

        embed = make_embed(title="AFK Enabled",
                           description=("You are now marked as AFK.\n"
                                        f"Reason: {reason}\n"
                                        f"Since: <t:{now}:R>"),
                           level="SUCCESS",
                           footer=f"Server: {interaction.guild.name}")

        await interaction.response.send_message(embed=embed, ephemeral=True)


async def setup(bot: commands.Bot):
    await bot.add_cog(AFK(bot))
