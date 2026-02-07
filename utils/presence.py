import discord
import time
from discord.ext import tasks
from itertools import cycle


class SarcasticPresenceRotator:
    """
    v2 Presence Rotator

    - Clean single-line statuses
    - Rotating activity types
    - Safer public-facing sarcasm
    - Discord-friendly formatting
    """

    def __init__(self, bot: discord.Client):
        self.bot = bot
        self.started_at = int(time.time())

        # ── Activity messages (single-line, readable)
        self.messages = cycle([
            "kaa pehni ho aaj 👀",
            "biyah hogya hai tumhara?",
            "bhai mujhe nahi pata, syn se puch lo",
            "kartikey mera dusra papa hai",
            "putli ka naam mat lo mere saamne",
            "debugging human emotions",
        ])

        # ── Rotate activity types for variety
        self.activity_types = cycle([
            discord.ActivityType.watching,
            discord.ActivityType.listening,
            discord.ActivityType.playing,
        ])

    @tasks.loop(seconds=45)
    async def rotate(self):
        # Safety: bot must be ready
        if not self.bot.is_ready():
            return

        message = next(self.messages)
        activity_type = next(self.activity_types)

        activity = discord.Activity(
            type=activity_type,
            name=message,
            start=self.started_at,
        )

        await self.bot.change_presence(
            status=discord.Status.online,
            activity=activity,
        )

    async def start(self):
        if not self.rotate.is_running():
            self.rotate.start()
