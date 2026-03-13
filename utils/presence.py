import discord
import time

from discord.ext import tasks
from itertools import cycle
from datetime import timedelta


class PresenceRotator:
    """Minimal & Rate-limit safe presence system"""

    ROTATE_INTERVAL = 1800  # 30 minutes

    def __init__(self, bot: discord.Client):
        self.bot = bot
        self.started_at = time.time()

        self.activities = cycle([
            self._uptime_activity,
            self._servers_activity
        ])

    # Helpers

    def uptime(self) -> str:
        seconds = int(time.time() - self.started_at)
        return str(timedelta(seconds=seconds)).split(".")[0]

    # Activities

    def _uptime_activity(self):
        return discord.Activity(
            type=discord.ActivityType.playing,
            name=f"online for {self.uptime()}",
        )

    def _servers_activity(self):
        return discord.Activity(
            type=discord.ActivityType.watching,
            name=f"{len(self.bot.guilds)} servers",
        )

    # Loop

    @tasks.loop(seconds=ROTATE_INTERVAL)
    async def rotate(self):

        if not self.bot.is_ready():
            return

        activity_fn = next(self.activities)
        activity = activity_fn()

        await self.bot.change_presence(
            status=discord.Status.online,
            activity=activity
        )

    # Start

    async def start(self):
        if not self.rotate.is_running():
            self.rotate.start()