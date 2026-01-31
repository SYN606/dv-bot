import os
import discord
from discord.ext import commands
from dotenv import load_dotenv

from db.schema import init_schema
from utils.prefix import dv_prefix
from utils.interaction_check import command_toggle_check

from utils.media_only import enforce_media_only
from utils.sticky_handler import handle_sticky
from utils.afk_handler import handle_afk
from utils.mention import handle_bot_mention

# ─────────────────────────────
# Environment
# ─────────────────────────────
load_dotenv()
TOKEN = os.getenv("DISCORD_TOKEN")
if not TOKEN:
    raise RuntimeError("[ERROR] DISCORD_TOKEN not found in .env")

# ─────────────────────────────
# Intents
# ─────────────────────────────
intents = discord.Intents.default()
intents.members = True
intents.message_content = True

# ─────────────────────────────
# Bot
# ─────────────────────────────
bot = commands.Bot(
    command_prefix=dv_prefix,
    intents=intents,
    help_command=None,
)


# ─────────────────────────────
# Load cogs (cmd/ + subfolders)
# ─────────────────────────────
async def load_cogs():
    base_path = os.path.abspath("cmd")

    for root, _, files in os.walk(base_path):
        for file in files:
            if not file.endswith(".py") or file.startswith("__"):
                continue

            rel = os.path.relpath(os.path.join(root, file), base_path)
            module = rel.replace(os.sep, ".")[:-3]
            ext = f"cmd.{module}"

            try:
                await bot.load_extension(ext)
                print(f"[INFO] Loaded {ext}")
            except Exception as e:
                print(f"[ERROR] Failed to load {ext}: {e}")


# ─────────────────────────────
# Events
# ─────────────────────────────
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
    if message.guild is None:
        return

    # Media-only enforcement (members only)
    if await enforce_media_only(message):
        return

    # Sticky handler
    await handle_sticky(message)

    # Bot mention response
    await handle_bot_mention(bot, message)

    # AFK handler
    await handle_afk(message)

    # Required for hybrid commands
    await bot.process_commands(message)


# ─────────────────────────────
# Entrypoint
# ─────────────────────────────
def main():
    try:
        bot.run(TOKEN) # type: ignore
    except KeyboardInterrupt:
        print("[INFO] Shutdown requested")


if __name__ == "__main__":
    main()
