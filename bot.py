# bot.py
import os
import discord
from discord.ext import commands
from dotenv import load_dotenv

from db.schema import init_schema
from utils.handlers.prefix import dv_prefix, normalize_dv_prefix
from utils.interaction_check import command_toggle_check

# Handlers
from utils.handlers.counting_handler import handle_counting
from utils.handlers.media_only import enforce_media_only
from utils.handlers.sticky_handler import handle_sticky
from utils.handlers.afk_handler import handle_afk
from utils.handlers.mention import handle_bot_mention

# Presence
from utils.presence import SarcasticPresenceRotator

# ────────────────────────────────
# Env & Token
# ────────────────────────────────
load_dotenv()
TOKEN = os.getenv("DISCORD_TOKEN")
if not TOKEN:
    raise RuntimeError("[ERROR] DISCORD_TOKEN not found in .env")

# ────────────────────────────────
# Intents
# ────────────────────────────────
intents = discord.Intents.default()
intents.members = True
intents.message_content = True

bot = commands.Bot(
    command_prefix=dv_prefix,
    intents=intents,
    help_command=None,
)

presence_rotator: SarcasticPresenceRotator | None = None


# ────────────────────────────────
# Cog Loader
# ────────────────────────────────
async def load_cogs() -> None:
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
            except Exception as exc:
                print(f"[ERROR] Failed to load {ext}: {exc}")


# ────────────────────────────────
# Events
# ────────────────────────────────
@bot.event
async def on_ready() -> None:
    global presence_rotator

    print(f"[INFO] Logged in as {bot.user} ({bot.user.id})")  # type: ignore

    # Start sarcastic presence rotator once
    if presence_rotator is None:
        presence_rotator = SarcasticPresenceRotator(bot)
        await presence_rotator.start()
        print("[INFO] Sarcastic presence rotator started")

    print("[INFO] Bot is online and ready")


@bot.event
async def setup_hook() -> None:
    init_schema()
    print("[INFO] Database initialized")

    bot.tree.interaction_check = command_toggle_check

    await load_cogs()
    await bot.tree.sync()
    print("[INFO] Slash commands synced")


@bot.event
async def on_message(message: discord.Message) -> None:
    if message.guild is None:
        return

    # Normalize dv ping → dv prefix
    message.content = normalize_dv_prefix(message.content)

    # 🧮 0️⃣ COUNTING HANDLER (highest priority)
    if await handle_counting(message):
        return

    # 1️⃣ Media-only enforcement
    if await enforce_media_only(message):
        return

    # 2️⃣ Sticky handler
    await handle_sticky(message)

    # 3️⃣ Bot mention handler
    await handle_bot_mention(bot, message)

    # 4️⃣ AFK system
    await handle_afk(message)

    # 5️⃣ Commands
    await bot.process_commands(message)


# ────────────────────────────────
# Entrypoint
# ────────────────────────────────
def main() -> None:
    try:
        bot.run(TOKEN)  # type: ignore
    except KeyboardInterrupt:
        print("[INFO] Shutdown requested")


if __name__ == "__main__":
    main()
