import discord
from discord import app_commands
from discord.ext import commands

from utils.base_admin import BaseAdminCog
from utils.embeds import make_embed
from utils.emojis import EMOJIS
from utils.logging.mod_log import send_mod_log

from db.db_helpers.mod_logs import set_log_channel


class SetupLog(BaseAdminCog):
    """
    Configure moderation log channel.
    Admin-only.
    """

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

        # Permission auto-handled by BaseAdminCog

        # ─────────────────────────
        # Bot permission validation
        # ─────────────────────────
        bot_member = guild.me
        if bot_member is None:
            return

        permissions = channel.permissions_for(bot_member)

        if not permissions.send_messages or not permissions.embed_links:
            return await interaction.response.send_message(
                embed=make_embed(
                    title="Missing Permissions",
                    description=(
                        "I need **Send Messages** and **Embed Links** "
                        f"permissions in {channel.mention}."),
                    level="ERROR",
                ),
                ephemeral=True,
            )

        # ─────────────────────────
        # Save configuration
        # ─────────────────────────
        await set_log_channel(guild.id, channel.id)

        await interaction.response.send_message(
            embed=make_embed(
                title="Log Channel Configured",
                description=(
                    f"{EMOJIS['success']} Moderation logs will now be sent to "
                    f"{channel.mention}.\n\n"
                    f"{EMOJIS['arrow_point']} All admin and moderation "
                    "actions will be logged."),
                level="SUCCESS",
                footer="Moderation system • Digital Vigital",
            ),
            ephemeral=True,
        )

        # ─────────────────────────
        # Structured Logging
        # ─────────────────────────
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
