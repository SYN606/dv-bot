import asyncio
from datetime import timedelta
from itertools import cycle
import logging
import time
from typing import Callable, Iterator, Tuple

import discord
from discord.ext import commands, tasks

logger = logging.getLogger("Digital Vigital")


class PresenceRotator:
    """
    Manages dynamic rotation of the bot's rich presence / activity status.
    """

    ROTATE_INTERVAL: int = 1800  # 30 minutes

    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self.started_at: float = time.time()
        self._presence_lock = asyncio.Lock()
        self._cached_user_count: int = 0
        self._cached_guild_count: int = 0
        self._last_presence_key: str | None = None

        # Cycle of (Activity Builder Method, Status)
        self.presence_pool: Iterator[Tuple[Callable[[], discord.Activity],
                                           discord.Status]] = cycle([
                                               (self._help_activity,
                                                discord.Status.online),
                                               (self._servers_activity,
                                                discord.Status.online),
                                               (self._users_activity,
                                                discord.Status.online),
                                               (self._uptime_activity,
                                                discord.Status.idle),
                                           ])

    def uptime(self) -> str:
        """Returns the formatted uptime duration (e.g., '2d, 4h 12m' or '03:45:12')."""
        seconds = int(time.time() - self.started_at)
        return str(timedelta(seconds=seconds)).split(".")[0]

    def total_users(self) -> int:
        """Calculates total unique user count cached across reachable guilds."""
        try:
            users = len(self.bot.users)
            if users > 0:
                self._cached_user_count = users
                return users
        except Exception:
            pass

        users_set = {m.id for g in self.bot.guilds for m in g.members}
        self._cached_user_count = len(users_set)
        return self._cached_user_count

    def total_guilds(self) -> int:
        """Calculates total guild count connected to the bot."""
        self._cached_guild_count = len(self.bot.guilds)
        return self._cached_guild_count

    # ────────────────────────────────────────────────────────
    # Activity Generators
    # ────────────────────────────────────────────────────────
    def _help_activity(self) -> discord.Activity:
        """Prompts users with the primary help command."""
        return discord.Activity(
            type=discord.ActivityType.listening,
            name="/help | Commands & System",
        )

    def _servers_activity(self) -> discord.Activity:
        """Displays total managed servers."""
        guild_count = f"{self.total_guilds():,}"
        return discord.Activity(
            type=discord.ActivityType.watching,
            name=f"over {guild_count} communities",
        )

    def _users_activity(self) -> discord.Activity:
        """Displays total served users."""
        user_count = f"{self.total_users():,}"
        return discord.Activity(
            type=discord.ActivityType.playing,
            name=f"with {user_count} members",
        )

    def _uptime_activity(self) -> discord.Activity:
        """Displays system uptime."""
        return discord.Activity(
            type=discord.ActivityType.watching,
            name=f"Uptime: {self.uptime()}",
        )

    # ────────────────────────────────────────────────────────
    # Loop & Lifecycle Management
    # ────────────────────────────────────────────────────────
    @tasks.loop(seconds=ROTATE_INTERVAL)
    async def rotate(self) -> None:
        """Rotates the bot status to the next presence item in the pool."""
        if not self.bot.is_ready():
            return

        async with self._presence_lock:
            try:
                activity_fn, target_status = next(self.presence_pool)
                activity = activity_fn()

                current_presence_key = (
                    f"{target_status.value}:{activity.type.value}:{activity.name}"
                )
                if self._last_presence_key == current_presence_key:
                    return

                self._last_presence_key = current_presence_key
                await self.bot.change_presence(
                    status=target_status,
                    activity=activity,
                )

            except (discord.HTTPException, RuntimeError) as e:
                logger.warning(
                    f"[PRESENCE] Failed to update status presence: {e}")

    @rotate.before_loop
    async def before_rotate(self) -> None:
        """Wait until the client cache is fully ready before starting rotation."""
        await self.bot.wait_until_ready()

    def start(self) -> None:
        """Start the background status rotator task."""
        if self.rotate.is_running():
            return
        self.rotate.start()

    def stop(self) -> None:
        """Stop the background status rotator task."""
        if not self.rotate.is_running():
            return
        self.rotate.stop()
