import discord
import time
from discord.ext import tasks


class SarcasticPresenceRotator:

    def __init__(self, bot: discord.Client):
        self.bot = bot
        self.started_at = int(time.time())
        self.index = 0

        self.messages = [
            "kaa pehni ho aaj?",
            "biyah hogya hai tumhara",
            "Laand chatbe\nmumbai aake bolke dikha\nfir chat lebe ka?",
            "Bhai mujhe nahi pata syn se puchhlo",
            "Kartikey mera dusra papa hai.?",
            "Kon ? Putli ? \nare uss bauni ka name mat lo mere samne",
        ]

    @tasks.loop(seconds=45)
    async def rotate(self):
        message = self.messages[self.index]

        activity = discord.Activity(
            type=discord.ActivityType.watching,
            name=message,
            start=self.started_at,
        )

        await self.bot.change_presence(
            status=discord.Status.idle,
            activity=activity,
        )

        self.index = (self.index + 1) % len(self.messages)

    async def start(self):
        if not self.rotate.is_running():
            self.rotate.start()
