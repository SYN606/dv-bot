import os
import asyncio
import discord
from discord.ext import commands
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

TOKEN = os.getenv("DISCORD_TOKEN")

# Intents
intents = discord.Intents.default()
intents.message_content = True
intents.members = True

# Bot instance
bot = commands.Bot(command_prefix="!", intents=intents)


# Load all command cogs from cmd/
async def load_cogs():
    for filename in os.listdir("./cmd"):
        if filename.endswith(".py") and not filename.startswith("__"):
            await bot.load_extension(f"cmd.{filename[:-3]}")


@bot.event
async def on_ready():
    print(f"[+] Logged in as {bot.user} ({bot.user.id})")


@bot.event
async def setup_hook():
    await load_cogs()


def main():
    asyncio.run(bot.start(TOKEN))


if __name__ == "__main__":
    main()
