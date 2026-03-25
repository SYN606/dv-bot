import discord
from discord import app_commands
from discord.ext import commands

from utils.permissions.base_admin import BaseAdminCog
from utils.core.embeds import make_embed
from utils.core.emojis import EMOJIS
from utils.logging.mod_log import send_mod_log

from db.db_helpers.mod_logs import set_log_channel

# import cache from logger (important)
from utils.logging.mod_log import _log_cache


class SetupLog(BaseAdminCog):

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @app_commands.command(
        name="setup_log",
        description="Set the moderation log channel for this server",
    )
    @app_commands.describe(
        channel="Channel where moderation logs will be sent", )
    async def setup_log(
        self,
        interaction: discord.Interaction,
        channel: discord.TextChannel,
    ):
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

        bot_member = guild.me
        if bot_member is None:
            return

        perms = channel.permissions_for(bot_member)

        if not perms.send_messages or not perms.embed_links:
            return await interaction.response.send_message(
                embed=make_embed(
                    title="Missing Permissions",
                    description=(
                        "I need Send Messages and Embed Links permissions "
                        f"in {channel.mention}."),
                    level="ERROR",
                ),
                ephemeral=True,
            )

        await set_log_channel(guild.id, channel.id)

        # cache invalidation (important)
        _log_cache.pop(guild.id, None)

        await interaction.response.send_message(
            embed=make_embed(
                title="Log Channel Configured",
                description=
                (f"{EMOJIS['success']} Logs will be sent to {channel.mention}.\n\n"
                 f"{EMOJIS['arrow_point']} Moderation actions will now be tracked."
                 ),
                level="SUCCESS",
                footer="Moderation system • Digital Vigital",
            ),
            ephemeral=True,
        )

        await send_mod_log(
            guild=guild,
            category="CONFIG",
            title="Moderation Log Channel Set",
            description=f"Log channel configured to {channel.mention}.",
            level="SUCCESS",
            actor=interaction.user,
            extra_fields={
                "Channel ID": channel.id,
            },
        )


async def setup(bot: commands.Bot):
    await bot.add_cog(SetupLog(bot))
