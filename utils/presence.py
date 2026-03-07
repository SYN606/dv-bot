import discord
import time
import random

from discord.ext import tasks
from itertools import cycle
from datetime import timedelta
from dataclasses import dataclass

# Activity State


@dataclass(slots=True)
class PresenceState:
    type: discord.ActivityType
    text: str


# Presence Rotator


class PresenceRotator:
    """Clean & Robust Discord Presence System"""

    STREAM_URL = "https://syn606.pages.dev"
    STREAM_NAME = "SYN 606 control panel"

    ROTATE_INTERVAL = 60
    STREAM_INTERVAL = 6
    RARE_CHANCE = 0.05

    def __init__(self, bot: discord.Client):
        self.bot = bot
        self.started_at = time.time()
        self.rotation = 0

        self.status_cycle = cycle([
            discord.Status.online,
            discord.Status.idle,
        ])

        self.personality_states = cycle(self._build_personality_states())

    # ─────────────────────────────────────
    # Personality Pack
    # ─────────────────────────────────────

    def _build_personality_states(self):

        raw = [
            ("playing", "tum log fir rules tod rahe ho 👀"),
            ("watching", "kaun drama start karega 🍿"),
            ("listening", "admin ki tension 🎧"),
            ("playing", "ban hammer ready hai 🔨"),
            ("watching", "general chat ki bakchodi 👁️"),
            ("playing", "server ka boss main hoon 😎"),
            ("watching", "kaun mute hone wala hai 🤐"),
            ("playing", "permissions sambhal ke ⚠️"),
            ("listening", "modmail complaints 📩"),
            ("playing", "timeout dene ka mann hai ⏳"),
            ("watching", "sab observe kar raha hoon 🧠"),
            ("playing", "shadow mode 🌑"),
            ("watching", "kuch to gadbad hai 🤔"),
        ]

        return [
            PresenceState(getattr(discord.ActivityType, t), m) for t, m in raw
        ]

    # ─────────────────────────────────────
    # Uptime
    # ─────────────────────────────────────

    def uptime(self) -> str:
        seconds = int(time.time() - self.started_at)
        return str(timedelta(seconds=seconds)).split(".")[0]

    # ─────────────────────────────────────
    # Dynamic States
    # ─────────────────────────────────────

    def dynamic_states(self):

        latency = round(self.bot.latency * 1000)
        guilds = len(self.bot.guilds)

        return [
            PresenceState(discord.ActivityType.watching,
                          f"{guilds} servers sambhal raha hoon 🌍"),
            PresenceState(discord.ActivityType.playing,
                          f"latency {latency}ms ⚡"),
            PresenceState(discord.ActivityType.playing,
                          f"{self.uptime()} se online 🕒"),
        ]

    # ─────────────────────────────────────
    # Streaming
    # ─────────────────────────────────────

    def streaming_activity(self):
        return discord.Streaming(
            name=self.STREAM_NAME,
            url=self.STREAM_URL,
        )

    # ─────────────────────────────────────
    # Rare Activity
    # ─────────────────────────────────────

    def rare_activity(self):
        return discord.Activity(
            type=discord.ActivityType.playing,
            name="aaj kisi ki kismat kharab hai 👁️",
        )

    # ─────────────────────────────────────
    # Pick Activity
    # ─────────────────────────────────────

    def pick_activity(self):

        self.rotation += 1

        # Rare mysterious presence
        if random.random() < self.RARE_CHANCE:
            return self.rare_activity()

        # Streaming injection
        if self.rotation % self.STREAM_INTERVAL == 0:
            return self.streaming_activity()

        # Dynamic vs personality
        if random.random() < 0.6:
            state = random.choice(self.dynamic_states())
        else:
            state = next(self.personality_states)

        return discord.Activity(type=state.type, name=state.text)

    # ─────────────────────────────────────
    # Loop
    # ─────────────────────────────────────

    @tasks.loop(seconds=ROTATE_INTERVAL)
    async def rotate(self):

        if not self.bot.is_ready():
            return

        activity = self.pick_activity()

        await self.bot.change_presence(status=next(self.status_cycle),
                                       activity=activity)

    # ─────────────────────────────────────
    # Start
    # ─────────────────────────────────────

    async def start(self):
        if not self.rotate.is_running():
            self.rotate.start()
