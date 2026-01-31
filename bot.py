import os
import discord
from discord.ext import commands
from dotenv import load_dotenv

from db.schema import init_schema
from db.db_helpers.afk import get_afk, remove_afk
from db.db_helpers.sticky import (
    get_sticky,
    increment_and_check,
    update_last_message,
)

from utils.embeds import make_embed
from utils.interaction_check import command_toggle_check

load_dotenv()
TOKEN = os.getenv("DISCORD_TOKEN")
if TOKEN is None:
    raise RuntimeError("[ERROR] DISCORD_TOKEN not found in .env")

intents = discord.Intents.default()
intents.members = True
intents.message_content = True

bot = commands.Bot(command_prefix="!", intents=intents)


async def load_cogs():
    for file in os.listdir("./cmd"):
        if file.endswith(".py") and not file.startswith("__"):
            ext = f"cmd.{file[:-3]}"
            await bot.load_extension(ext)
            print(f"[INFO] Loaded {ext}")


@bot.event
async def on_ready():
    print(f"[INFO] Logged in as {bot.user} ({bot.user.id})") # type: ignore
    print("[INFO] Bot is online and ready")


@bot.event
async def setup_hook():
    init_schema()
    print("[INFO] Database initialized")

    # ATTACH GLOBAL INTERACTION CHECK BEFORE LOADING COGS
    bot.tree.interaction_check = command_toggle_check

    await load_cogs()
    await bot.tree.sync()
    print("[INFO] Slash commands synced")


@bot.event
async def on_message(message: discord.Message):
    if message.author.bot or message.guild is None:
        return

    # Bot mention response (direct mention only)
    if bot.user and message.content.strip() == bot.user.mention:
        latency = round(bot.latency * 1000)
        embed = make_embed(
            title="Hello!",
            description=(f"Pong: **{latency}ms**\n"
                         "Developed by **syn**\n"
                         "Use **/help** to know more."),
            level="SYSTEM",
        )
        await message.channel.send(embed=embed)

    # Sticky message handling
    content = get_sticky(message.guild.id, message.channel.id)
    if content:
        repost, last_id = increment_and_check(
            message.guild.id,
            message.channel.id,
        )

        if repost:
            if last_id:
                try:
                    old = await message.channel.fetch_message(last_id)
                    await old.delete()
                except Exception:
                    pass

            sent = await message.channel.send(content)
            update_last_message(
                message.guild.id,
                message.channel.id,
                sent.id,
            )

    # AFK mention notice
    for user in message.mentions:
        afk = get_afk(message.guild.id, user.id)
        if afk:
            embed = make_embed(
                title="User is AFK",
                description=(f"{user.mention} is currently AFK.\n"
                             f"Reason: {afk.reason}\n"
                             f"Since: <t:{afk.since}:R>"),
                level="INFO",
            )
            await message.channel.send(embed=embed)

    # Remove AFK on first message
    removed_afk = remove_afk(
        guild_id=message.guild.id,
        user_id=message.author.id,
    )

    if removed_afk:
        embed = make_embed(
            title="AFK Removed",
            description=("Welcome back. You are no longer marked as AFK.\n"
                         f"AFK duration: <t:{removed_afk.since}:R>"),
            level="INFO",
        )
        await message.channel.send(embed=embed)

    await bot.process_commands(message)


def main():
    try:
        bot.run(TOKEN) # type: ignore
    except KeyboardInterrupt:
        print("[INFO] Shutdown requested")


if __name__ == "__main__":
    main()
