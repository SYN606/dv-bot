import discord
import time
import random
from discord.ext import tasks
from itertools import cycle
from datetime import timedelta


class PresenceRotator:
    """
    Roman Hindi Personality Presence System

    - Emoji rich
    - Human sarcastic tone
    - Weighted rotation
    - Rare mysterious state
    - Streaming injection
    """

    def __init__(self, bot: discord.Client):
        self.bot = bot
        self.started_at = time.time()

        # 🔥 Personality Pack (Roman Hindi + Emojis)
        self.personality_states = cycle([
            ("playing", "tum log fir rules tod rahe ho 👀"),
            ("watching", "kaun drama start karne wala hai 🍿"),
            ("listening", "admin ki tension 🎧"),
            ("playing", "ban hammer ready hai 🔨"),
            ("watching", "kaun mute hone wala hai 🤐"),
            ("playing", "server ka asli boss main hoon 😎"),
            ("watching", "general chat ki bakchodi 👁️"),
            ("playing", "permissions sambhal ke chalna ⚠️"),
            ("listening", "complaints in modmail 📩"),
            ("playing", "timeout dene ka mann kar raha hai ⏳"),
            ("watching", "tum sab ko observe kar raha hoon 🧠"),
            ("playing", "silent mode me planning 😌"),
            ("watching", "kaun jhoot bol raha hai 🤨"),
            ("playing", "power misuse detect ho raha hai 🚨"),
            ("watching", "appeal likhne ki taiyari karo 📝"),
            ("playing", "rate limit se bach ke 😏"),
            ("watching", "kuch to gadbad lag rahi hai 🤔"),
            ("playing", "shadow mode activated 🌑"),
        ])

        self.status_cycle = cycle([
            discord.Status.online,
            discord.Status.idle,
        ])

        self.rotation_counter = 0

    # ─────────────────────────────
    # Uptime
    # ─────────────────────────────
    def get_uptime(self):
        seconds = int(time.time() - self.started_at)
        return str(timedelta(seconds=seconds)).split(".")[0]

    # ─────────────────────────────
    # Dynamic States
    # ─────────────────────────────
    def build_dynamic_states(self):

        latency = round(self.bot.latency * 1000)
        guild_count = len(self.bot.guilds)

        return [
            ("watching", f"{guild_count} servers sambhal raha hoon 🌍"),
            ("playing", f"latency {latency}ms pe chal raha hoon ⚡"),
            ("playing", f"{self.get_uptime()} se online hoon 🕒"),
        ]

    # ─────────────────────────────
    # Streaming Presence (Clickable)
    # ─────────────────────────────
    def build_streaming(self):
        return discord.Streaming(
            name="SYN 606 control panel 🚀",
            url="https://syn606.pages.dev",  # your link
        )

    # ─────────────────────────────
    # Main Loop
    # ─────────────────────────────
    @tasks.loop(seconds=60)
    async def rotate(self):

        if not self.bot.is_ready():
            return

        self.rotation_counter += 1
        dynamic_states = self.build_dynamic_states()

        # 🔥 Rare mysterious vibe (5%)
        if random.random() < 0.05:
            activity = discord.Activity(
                type=discord.ActivityType.playing,
                name="aaj kisi ki kismat kharab hai 👁️",
            )

        # 🔴 Streaming injection every 6 rotations
        elif self.rotation_counter % 6 == 0:
            activity = self.build_streaming()

        else:
            roll = random.random()

            # 60% dynamic, 40% personality
            if roll < 0.6:
                activity_type_str, message = random.choice(dynamic_states)
            else:
                activity_type_str, message = next(self.personality_states)

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
            status=next(self.status_cycle),
            activity=activity,
        )

    async def start(self):
        if not self.rotate.is_running():
            self.rotate.start()
