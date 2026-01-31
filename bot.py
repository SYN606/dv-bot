import os
import discord
from discord.ext import commands
from dotenv import load_dotenv

from db.schema import init_schema
from utils.prefix import dv_prefix, normalize_dv_prefix
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
    command_prefix=dv_prefix,  # dv / DV / dv ping / dvping
    intents=intents,
    help_command=None,  # custom help only
)


# ─────────────────────────────
# Cog Loader (cmd/ + subfolders)
# ─────────────────────────────
async def load_cogs() -> None:
    base_path = os.path.abspath("cmd")

    for root, _, files in os.walk(base_path):
        for file in files:
            if not file.endswith(".py") or file.startswith("__"):
                continue

            rel_path = os.path.relpath(
                os.path.join(root, file),
                base_path,
            )

            module = rel_path.replace(os.sep, ".")[:-3]
            extension = f"cmd.{module}"

            try:
                await bot.load_extension(extension)
                print(f"[INFO] Loaded {extension}")
            except Exception as exc:
                print(f"[ERROR] Failed to load {extension}: {exc}")


# ─────────────────────────────
# Events
# ─────────────────────────────
@bot.event
async def on_ready() -> None:
    print(f"[INFO] Logged in as {bot.user} ({bot.user.id})")  # type: ignore
    print("[INFO] Bot is online and ready")


@bot.event
async def setup_hook() -> None:
    # Database schema
    init_schema()
    print("[INFO] Database initialized")

    # Global slash-command toggle
    bot.tree.interaction_check = command_toggle_check

    # Load commands
    await load_cogs()
    await bot.tree.sync()
    print("[INFO] Slash commands synced")


@bot.event
async def on_message(message: discord.Message) -> None:
    if message.guild is None:
        return
    
    message.content = normalize_dv_prefix(message.content)
    # 1️⃣ Media-only enforcement (members only, bots allowed)
    if await enforce_media_only(message):
        return

    # 2️⃣ Sticky messages
    await handle_sticky(message)

    # 3️⃣ Bot mention response
    await handle_bot_mention(bot, message)

    # 4️⃣ AFK system
    await handle_afk(message)

    # 5️⃣ Hybrid / prefix commands
    await bot.process_commands(message)


# ─────────────────────────────
# Entrypoint
# ─────────────────────────────
def main() -> None:
    try:
        bot.run(TOKEN)  # type: ignore
    except KeyboardInterrupt:
        print("[INFO] Shutdown requested")


if __name__ == "__main__":
    main()
