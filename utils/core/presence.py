import asyncio
import time
import logging
from datetime import timedelta
from itertools import cycle
import discord
from discord.ext import tasks

logger = logging.getLogger("Digital Vigital")


class PresenceRotator:

    ROTATE_INTERVAL = 1800  

    def __init__(self, bot: discord.Client):
        self.bot = bot
        self.started_at = time.time()
        self._presence_lock = asyncio.Lock()
        self._cached_user_count = 0
        self._cached_guild_count = 0
        self._last_presence_key: str | None = None

        self.presence_pool = cycle([
            (self._uptime_activity, discord.Status.idle),
            (self._servers_activity, discord.Status.idle),
            (self._users_activity, discord.Status.idle)
        ])


    def uptime(self) -> str:
        seconds = int(time.time() - self.started_at)
        return str(timedelta(seconds=seconds)).split(".")[0]

    def total_users(self) -> int:
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
        self._cached_guild_count = len(self.bot.guilds)
        return self._cached_guild_count


    def _uptime_activity(self) -> discord.Activity:
        return discord.Activity(type=discord.ActivityType.playing,
                                name=f"online for {self.uptime()}")

    def _servers_activity(self) -> discord.Activity:
        return discord.Activity(type=discord.ActivityType.watching,
                                name=f"{self.total_guilds()} servers")

    def _users_activity(self) -> discord.Activity:
        return discord.Activity(type=discord.ActivityType.listening,
                                name=f"{self.total_users()} users")


    @tasks.loop(seconds=ROTATE_INTERVAL)
    async def rotate(self) -> None:
        if not self.bot.is_ready():
            return

        async with self._presence_lock:
            try:
                activity_fn, target_status = next(self.presence_pool)
                activity = activity_fn()

                current_presence_key = f"{target_status.value}:{activity.type.value}:{activity.name}"
                if self._last_presence_key == current_presence_key:
                    return

                self._last_presence_key = current_presence_key
                await self.bot.change_presence(status=target_status,
                                               activity=activity)

            except (discord.HTTPException, RuntimeError) as e:
                logger.warning(
                    f"[PRESENCE] Presence status cycle update error: {e}")

    @rotate.before_loop
    async def before_rotate(self) -> None:
        await self.bot.wait_until_ready()


    def start(self) -> None:
        if self.rotate.is_running():
            return
        self.rotate.start()

    def stop(self) -> None:
        if not self.rotate.is_running():
            return
        self.rotate.stop()
