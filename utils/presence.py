import discord
import time
import random
from discord.ext import tasks
from itertools import cycle
from datetime import timedelta


class SarcasticPresenceRotator:
    """
    v4 Presence Rotator

    - Original sarcastic lines restored
    - Dynamic stats mixed in
    - Cleaner rotation logic
    - Optional streaming trick support
    """

    def __init__(self, bot: discord.Client):
        self.bot = bot
        self.started_at = time.time()

        # 🔥 Your original sarcastic lines (restored)
        self.sarcastic_messages = [
            ("watching", "kaa pehni ho aaj 👀"),
            ("watching", "biyah hogya hai tumhara?"),
            ("listening", "bhai mujhe nahi pata, syn se puch lo"),
            ("playing", "kartikey mera dusra papa hai"),
            ("watching", "putli ka naam mat lo mere saamne"),
            ("playing", "debugging human emotions"),
        ]

        self.sarcastic_cycle = cycle(self.sarcastic_messages)

    # ─────────────────────────────
    # Utility: formatted uptime
    # ─────────────────────────────
    def get_uptime(self) -> str:
        seconds = int(time.time() - self.started_at)
        return str(timedelta(seconds=seconds)).split(".")[0]

    # ─────────────────────────────
    # Presence loop
    # ─────────────────────────────
    @tasks.loop(seconds=45)
    async def rotate(self):

        if not self.bot.is_ready():
            return

        latency = round(self.bot.latency * 1000)
        guild_count = len(self.bot.guilds)
        user_count = sum(g.member_count or 0 for g in self.bot.guilds)

        dynamic_states = [
            ("watching", f"{guild_count} servers"),
            ("watching", f"{user_count:,} members"),
            ("playing", f"Latency: {latency}ms"),
            ("playing", f"Uptime: {self.get_uptime()}"),
        ]

        # 🔀 Randomly choose between dynamic and sarcastic
        if random.random() < 0.5:
            activity_type_str, message = random.choice(dynamic_states)
        else:
            activity_type_str, message = next(self.sarcastic_cycle)

        activity_type = {
            "watching": discord.ActivityType.watching,
            "listening": discord.ActivityType.listening,
            "playing": discord.ActivityType.playing,
        }[activity_type_str]

        activity = discord.Activity(
            type=activity_type,
            name=message,
        )

        await self.bot.change_presence(
            status=discord.Status.online,
            activity=activity,
        )

    async def start(self):
        if not self.rotate.is_running():
            self.rotate.start()
