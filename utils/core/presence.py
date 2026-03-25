import discord
import time

from discord.ext import tasks
from itertools import cycle
from datetime import timedelta


class PresenceRotator:
    """Clean, dynamic & rate-limit safe presence system"""

    ROTATE_INTERVAL = 1800  # 30 minutes

    def __init__(self, bot: discord.Client):
        self.bot = bot
        self.started_at = time.time()

        self.activities = cycle([
            self._uptime_activity,
            self._servers_activity,
            self._users_activity,
        ])

    # ─────────────────────────
    # HELPERS
    # ─────────────────────────

    def uptime(self) -> str:
        seconds = int(time.time() - self.started_at)
        return str(timedelta(seconds=seconds)).split(".")[0]

    def total_users(self) -> int:
        # Unique users across all guilds
        return len({member.id for guild in self.bot.guilds for member in guild.members})

    # ─────────────────────────
    # ACTIVITIES
    # ─────────────────────────

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

    def _users_activity(self):
        return discord.Activity(
            type=discord.ActivityType.listening,
            name=f"{self.total_users()} users",
        )

    # ─────────────────────────
    # LOOP
    # ─────────────────────────

    @tasks.loop(seconds=ROTATE_INTERVAL)
    async def rotate(self):

        if not self.bot.is_ready():
            return

        try:
            activity_fn = next(self.activities)
            activity = activity_fn()

            await self.bot.change_presence(
                status=discord.Status.online,
                activity=activity
            )

        except Exception:
            # fail silently (presence should never crash bot)
            pass

    # ─────────────────────────
    # START
    # ─────────────────────────

    async def start(self):
        if not self.rotate.is_running():
            self.rotate.start()