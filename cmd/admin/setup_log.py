import logging

import discord
from discord import app_commands
from discord.ext import commands

from db.db_helpers.mod_logs import set_log_channel
from utils.core.embeds import make_embed
from utils.core.emojis import EMOJIS
from utils.logging.mod_log import _log_cache, send_mod_log
from utils.permissions.base_admin import BaseAdminCog

logger = logging.getLogger("bot")


class SetupLog(BaseAdminCog):
    """Cog responsible for configuring the moderation logging channel for the server."""

    def __init__(self, bot: commands.Bot) -> None:
        self.bot = bot

    async def _reply(
        self,
        interaction: discord.Interaction,
        *,
        title: str,
        description: str,
        level: str = "ERROR",
    ) -> None:
        embed = make_embed(title=title, description=description, level=level)
        try:
            if interaction.response.is_done():
                await interaction.followup.send(embed=embed, ephemeral=True)
            else:
                await interaction.response.send_message(embed=embed,
                                                        ephemeral=True)
        except discord.HTTPException:
            pass

    @app_commands.command(
        name="setup_log",
        description="Set the moderation log channel for this server",
    )
    @app_commands.describe(
        channel="Channel where moderation logs will be sent")
    async def setup_log(self, interaction: discord.Interaction,
                        channel: discord.TextChannel) -> None:
        guild = interaction.guild
        actor = interaction.user

        if guild is None:
            await self._reply(
                interaction,
                title="Invalid Context",
                description="This command can only be used in a server.",
            )
            return

        if not isinstance(actor, discord.Member):
            return

        bot_member = guild.me
        if bot_member is None:
            return

        perms = channel.permissions_for(bot_member)
        missing: list[str] = []

        if not perms.send_messages:
            missing.append("Send Messages")

        if not perms.embed_links:
            missing.append("Embed Links")

        if missing:
            missing_list = "\n".join(f"• `{perm}`" for perm in missing)
            await self._reply(
                interaction,
                title="Missing Permissions",
                description=(
                    f"I am missing:\n\n{missing_list}\n\nin {channel.mention}."
                ),
            )
            return

        try:
            await set_log_channel(guild.id, channel.id)
        except Exception:
            logger.exception("Failed to save log channel configuration")
            await self._reply(
                interaction,
                title="Database Error",
                description="Failed to save the log channel configuration.",
            )
            return

        # Clear active cache entry
        _log_cache.pop(guild.id, None)

        success_emoji = EMOJIS.get("success") or "✅"
        arrow_emoji = EMOJIS.get("arrow_point") or "▶"

        await self._reply(
            interaction,
            title="Log Channel Configured",
            description=
            (f"{success_emoji} Logs will now be sent to {channel.mention}.\n\n"
             f"{arrow_emoji} Moderation actions will now be tracked."),
            level="SUCCESS"
        )

        try:
            await send_mod_log(
                guild=guild,
                category="CONFIG",
                title="Moderation Log Channel Set",
                description=f"Log channel configured to {channel.mention}.",
                level="SUCCESS",
                actor=actor,
                extra_fields={"Channel ID": channel.id}
            )
        except Exception:
            logger.exception("Failed to send log setup moderation log")


# CENTRALIZED CONFIG ACCESS
setattr(SetupLog.setup_log, "config_command", True)


async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(SetupLog(bot))
