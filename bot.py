# bot.py
import os
import discord
from discord.ext import commands
from dotenv import load_dotenv

from db.schema import init_schema
from utils.handlers.prefix import dv_prefix, normalize_dv_prefix
from utils.interaction_check import command_toggle_check

from utils.handlers.counting_handler import handle_counting
from utils.handlers.media_only import enforce_media_only
from utils.handlers.sticky_handler import handle_sticky
from utils.handlers.afk_handler import handle_afk
from utils.handlers.mention import handle_bot_mention

from utils.presence import SarcasticPresenceRotator
from utils.startups.verification_startup import setup_verification_on_ready

# ────────────────────────────────
# ENV
# ────────────────────────────────
load_dotenv()
TOKEN = os.getenv("DISCORD_TOKEN")
if not TOKEN:
    raise RuntimeError("DISCORD_TOKEN not found")

# ────────────────────────────────
# BOT SETUP
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
# COG LOADER
# ────────────────────────────────
async def load_cogs() -> None:
    base_path = os.path.abspath("cmd")

    for root, _, files in os.walk(base_path):
        for file in files:
            if file.endswith(".py") and not file.startswith("__"):
                rel = os.path.relpath(os.path.join(root, file), base_path)
                ext = f"cmd.{rel.replace(os.sep, '.')[:-3]}"
                try:
                    await bot.load_extension(ext)
                    print(f"[INFO] Loaded {ext}")
                except Exception as exc:
                    print(f"[ERROR] Failed to load {ext}: {exc}")


# ────────────────────────────────
# EVENTS
# ────────────────────────────────
@bot.event
async def setup_hook() -> None:
    init_schema()
    bot.tree.interaction_check = command_toggle_check
    await load_cogs()
    await bot.tree.sync()
    print("[INFO] Startup complete")


@bot.event
async def on_ready() -> None:
    global presence_rotator

    print(f"[INFO] Logged in as {bot.user} ({bot.user.id})")  # type: ignore

    await setup_verification_on_ready(bot)

    if presence_rotator is None:
        presence_rotator = SarcasticPresenceRotator(bot)
        await presence_rotator.start()
        print("[INFO] Presence rotator started")

    print("[INFO] Bot ready")


@bot.event
async def on_message(message: discord.Message) -> None:
    if message.guild is None:
        return

    message.content = normalize_dv_prefix(message.content)

    if await handle_counting(message):
        return

    if await enforce_media_only(message):
        return

    await handle_sticky(message)
    await handle_bot_mention(bot, message)
    await handle_afk(message)
    await bot.process_commands(message)


# ────────────────────────────────
# ENTRYPOINT
# ────────────────────────────────
def main() -> None:
    try:
        bot.run(TOKEN)  # type: ignore
    except KeyboardInterrupt:
        print("[INFO] Shutdown requested")


if __name__ == "__main__":
    main()
