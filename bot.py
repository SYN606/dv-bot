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
from db.db_helpers.media_only import is_media_only

from utils.embeds import make_embed
from utils.interaction_check import command_toggle_check

# ─── ENV
load_dotenv()
TOKEN = os.getenv("DISCORD_TOKEN")
if not TOKEN:
    raise RuntimeError("[ERROR] DISCORD_TOKEN not found in .env")

# ─── INTENTS
intents = discord.Intents.default()
intents.members = True
intents.message_content = True

# ─── PREFIX HANDLER (dv, dvping, dv ping, dv    ping)
def get_prefix(bot: commands.Bot, message: discord.Message):
    if not message.content:
        return "dv"

    content = message.content.lower().lstrip()
    if content.startswith("dv"):
        return "dv"

    return "dv"


# ─── BOT
bot = commands.Bot(
    command_prefix=get_prefix,
    intents=intents,
    help_command=None,  # we provide our own help
)

# ─── LOAD COGS (supports subfolders like hybrid_cmd)
async def load_cogs():
    base_path = os.path.abspath("cmd")

    for root, _, files in os.walk(base_path):
        for file in files:
            if not file.endswith(".py") or file.startswith("__"):
                continue

            full_path = os.path.join(root, file)
            rel_path = os.path.relpath(full_path, base_path)

            module = rel_path.replace(os.sep, ".")[:-3]
            extension = f"cmd.{module}"

            if extension in bot.extensions:
                continue

            await bot.load_extension(extension)
            print(f"[INFO] Loaded {extension}")

# ─── EVENTS
@bot.event
async def on_ready():
    print(f"[INFO] Logged in as {bot.user} ({bot.user.id})")  # type: ignore
    print("[INFO] Bot is online and ready")

@bot.event
async def setup_hook():
    init_schema()
    print("[INFO] Database initialized")

    bot.tree.interaction_check = command_toggle_check

    await load_cogs()
    await bot.tree.sync()
    print("[INFO] Slash commands synced")

@bot.event
async def on_message(message: discord.Message):
    if message.author.bot or not message.guild:
        return

    # ── MEDIA-ONLY ENFORCEMENT
    if is_media_only(message.guild.id, message.channel.id):
        if not message.attachments and not message.embeds:
            try:
                await message.delete()
            except Exception:
                pass
            return

    # ── BOT MENTION RESPONSE
    if bot.user and message.content.strip() == bot.user.mention:
        latency = round(bot.latency * 1000)
        embed = make_embed(
            title="Hello!",
            description=(
                f"Pong: **{latency}ms**\n"
                "Developed by **[SYN](https://syn606.pages.dev)**\n"
                "Use **/help** or `dv help` to know more"
            ),
            level="SYSTEM",
        )
        await message.channel.send(embed=embed)

    # ── STICKY MESSAGE
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

    # ── AFK MENTION NOTICE
    for user in message.mentions:
        afk = get_afk(message.guild.id, user.id)
        if afk:
            embed = make_embed(
                title="User is AFK",
                description=(
                    f"{user.mention} is currently AFK.\n"
                    f"Reason: {afk.reason}\n"
                    f"Since: <t:{afk.since}:R>"
                ),
                level="INFO",
            )
            await message.channel.send(embed=embed)

    # ── REMOVE AFK ON MESSAGE
    removed_afk = remove_afk(
        guild_id=message.guild.id,
        user_id=message.author.id,
    )

    if removed_afk:
        embed = make_embed(
            title="AFK Removed",
            description=(
                "Welcome back. You are no longer marked as AFK.\n"
                f"AFK duration: <t:{removed_afk.since}:R>"
            ),
            level="INFO",
        )
        await message.channel.send(embed=embed)

    # REQUIRED FOR HYBRID COMMANDS
    await bot.process_commands(message)

# ─── ENTRYPOINT
def main():
    try:
        bot.run(TOKEN)
    except KeyboardInterrupt:
        print("[INFO] Shutdown requested")

if __name__ == "__main__":
    main()
