import discord
from discord import app_commands
from discord.ext import commands

from utils.check_perms import is_bot_admin
from utils.embeds import make_embed
from utils.emojis import EMOJIS

from db.db_helpers.verification import (
    get_verification_config,
    delete_verification_config,
)


class ResetVerification(commands.Cog):

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @app_commands.command(
        name="reset_verification",
        description="Reset and disable the verification system",
    )
    async def reset_verification(self, interaction: discord.Interaction):

        guild = interaction.guild
        if guild is None:
            return await interaction.response.send_message(
                embed=make_embed(
                    title="Invalid Context",
                    description="This command can only be used in a server.",
                    level="ERROR",
                ),
                ephemeral=True,
            )

        # Permission check
        if not await is_bot_admin(interaction):
            return await interaction.response.send_message(
                embed=make_embed(
                    title="Permission Denied",
                    description="You are not allowed to reset verification.",
                    level="ERROR",
                ),
                ephemeral=True,
            )

        # Get existing config
        config = await get_verification_config(guild.id)

        if not config:
            return await interaction.response.send_message(
                embed=make_embed(
                    title="Verification Not Configured",
                    description="Verification is already disabled.",
                    level="INFO",
                ),
                ephemeral=True,
            )

        # Delete verification message if exists
        if config.verification_message_id:
            channel = guild.get_channel(config.verify_channel_id)

            if isinstance(channel, discord.TextChannel):
                try:
                    message = await channel.fetch_message(
                        config.verification_message_id)
                    await message.delete()
                except discord.NotFound:
                    pass
                except discord.Forbidden:
                    pass

        # Delete DB config
        await delete_verification_config(guild.id)

        await interaction.response.send_message(
            embed=make_embed(
                title="Verification Reset",
                description=(
                    f"{EMOJIS['success']} Verification system disabled.\n\n"
                    f"{EMOJIS['arrow_point']} Verification message removed."),
                level="SUCCESS",
                footer=f"Action by {interaction.user}",
            ),
            ephemeral=True,
        )


async def setup(bot: commands.Bot):
    await bot.add_cog(ResetVerification(bot))
