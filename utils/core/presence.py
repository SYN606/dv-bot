import asyncio
import time

from datetime import timedelta
from itertools import cycle

import discord

from discord.ext import tasks


class PresenceRotator:
    """
    Dynamic, cache-safe and
    rate-limit friendly
    presence rotation system.
    """

    ROTATE_INTERVAL = 1800

    def __init__(
        self,
        bot: discord.Client,
    ):

        self.bot = bot

        self.started_at = time.time()

        self._presence_lock = asyncio.Lock()

        self._cached_user_count = 0

        self._cached_guild_count = 0

        self._last_presence: str | None = None

        self.activities = cycle([
            self._uptime_activity,
            self._servers_activity,
            self._users_activity,
        ])

    # HELPERS

    def uptime(self) -> str:

        seconds = int(time.time() - self.started_at)

        return str(timedelta(seconds=seconds)).split(".")[0]

    def total_users(self) -> int:
        """
        Unique users across guilds.
        Cached for lower CPU usage.
        """

        users = {
            member.id
            for guild in self.bot.guilds
            for member in guild.members
        }

        self._cached_user_count = len(users)

        return self._cached_user_count

    def total_guilds(self) -> int:

        self._cached_guild_count = len(self.bot.guilds)

        return self._cached_guild_count

    # ACTIVITIES

    def _uptime_activity(self, ) -> discord.Activity:

        return discord.Activity(
            type=discord.ActivityType.playing,
            name=(f"online for "
                  f"{self.uptime()}"),
        )

    def _servers_activity(self, ) -> discord.Activity:

        return discord.Activity(
            type=discord.ActivityType.watching,
            name=(f"{self.total_guilds()} "
                  f"servers"),
        )

    def _users_activity(self, ) -> discord.Activity:

        return discord.Activity(
            type=discord.ActivityType.listening,
            name=(f"{self.total_users()} "
                  f"users"),
        )

    # ROTATION LOOP

    @tasks.loop(seconds=ROTATE_INTERVAL)
    async def rotate(self, ) -> None:

        if not self.bot.is_ready():
            return

        async with self._presence_lock:

            try:

                activity_fn = next(self.activities)

                activity = activity_fn()

                # prevent duplicate updates
                activity_name = (activity.name)

                if (self._last_presence == activity_name):

                    return

                self._last_presence = (activity_name)

                await self.bot.change_presence(
                    status=discord.Status.online,
                    activity=activity,
                )

            except (
                    discord.HTTPException,
                    RuntimeError,
            ):

                pass

    # WAIT FOR READY

    @rotate.before_loop
    async def before_rotate(self, ) -> None:

        await self.bot.wait_until_ready()

    # START

    async def start(self, ) -> None:

        if self.rotate.is_running():
            return

        self.rotate.start()

    # STOP

    async def stop(self, ) -> None:

        if not self.rotate.is_running():
            return

        self.rotate.cancel()
