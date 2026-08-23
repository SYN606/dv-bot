from __future__ import annotations

import logging
import discord
from discord.ext import commands
from db.models import Guild

logger = logging.getLogger("Digital Vigital")


class GuildSyncHandler:
    """Listens for guild lifecycle events and manages database state safely."""

    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self._register_listeners()

    def _register_listeners(self) -> None:
        self.bot.add_listener(self.on_ready, "on_ready")
        self.bot.add_listener(self.on_guild_join, "on_guild_join")
        self.bot.add_listener(self.on_guild_remove, "on_guild_remove")

    async def on_ready(self) -> None:
        if not self.bot.guilds:
            logger.warning(
                "[GUILD SYNC] Bot cache is empty on ready. Skipping bulk sync."
            )
            return

        active_ids = [guild.id for guild in self.bot.guilds]

        # Ensure all currently connected guilds exist in DB
        for guild_id in active_ids:
            await Guild.get_or_create(guild_id=guild_id)

        logger.info(
            f"[GUILD SYNC] Synced {len(active_ids)} active guilds into DB.")

    async def on_guild_join(self, guild: discord.Guild) -> None:
        """Create base DB record when added to a new server."""
        await Guild.get_or_create(guild_id=guild.id)
        logger.info(
            f"[GUILD SYNC] Joined guild: {guild.name} ({guild.id}) — DB initialized."
        )

    async def on_guild_remove(self, guild: discord.Guild) -> None:
        """Cascade-delete all guild data when kicked or server is deleted."""
        deleted_count = await Guild.filter(guild_id=guild.id).delete()
        if deleted_count:
            logger.info(
                f"[GUILD SYNC] Removed from {guild.name} ({guild.id}) — Cleaned DB data."
            )


async def startup(bot: commands.Bot) -> None:
    """Startup runner hook registered in bot initialization."""
    logger.info("[GUILD SYNC] Initializing guild tracking handler...")
    setattr(bot, "guild_sync_handler", GuildSyncHandler(bot))
