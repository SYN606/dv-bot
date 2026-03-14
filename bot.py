import os
import asyncio
import logging
import time
import discord
from discord.ext import commands
from dotenv import load_dotenv

from db.schema import init_schema
from utils.handlers.prefix import dynamic_prefix, normalize_prefix
from utils.interaction_check import command_toggle_check

from utils.handlers.counting_handler import handle_counting
from utils.handlers.media_only import enforce_media_only
from utils.handlers.sticky_handler import handle_sticky
from utils.handlers.afk_handler import handle_afk
from utils.handlers.mention import handle_bot_mention

from utils.presence import PresenceRotator
from utils.startups.verification_startup import setup_verification_on_ready
from utils.views.verification_views.verify_button_view import VerifyButtonView

# ─────────────────────────
# ENV
# ─────────────────────────
load_dotenv()

TOKEN = os.getenv("DISCORD_TOKEN")
SYNC_COMMANDS = os.getenv("SYNC_COMMANDS", "true").lower() == "true"
DEBUG_HTTP = os.getenv("DEBUG_HTTP", "false").lower() == "true"

if not TOKEN:
    raise RuntimeError("DISCORD_TOKEN not found in .env")

# ─────────────────────────
# LOGGING
# ─────────────────────────
logging.basicConfig(level=logging.INFO)

if DEBUG_HTTP:
    logging.getLogger("discord.http").setLevel(logging.DEBUG)

# ─────────────────────────
# INTENTS
# ─────────────────────────
intents = discord.Intents.default()
intents.members = True
intents.message_content = True


# ─────────────────────────
# BOT CLASS
# ─────────────────────────
class DigitalVigilBot(commands.Bot):

    def __init__(self) -> None:
        super().__init__(
            command_prefix=dynamic_prefix,
            intents=intents,
            help_command=None,
        )

        self.presence_rotator: PresenceRotator | None = None

    # ─────────────────────────
    # SETUP HOOK
    # ─────────────────────────
    async def setup_hook(self) -> None:

        await init_schema()

        self.tree.interaction_check = command_toggle_check

        await self.load_all_extensions()

        if SYNC_COMMANDS:
            try:
                await self.tree.sync()
                print("[INFO] Slash commands synced")
            except Exception as exc:
                print(f"[ERROR] Slash sync failed: {exc}")

        self.add_view(VerifyButtonView())

        print("[SYSTEM] Setup hook completed")

    # ─────────────────────────
    # EXTENSION LOADER
    # ─────────────────────────
    async def load_all_extensions(self) -> None:

        base_path = os.path.abspath("cmd")

        loaded = 0
        failed = 0

        for root, _, files in os.walk(base_path):
            for file in files:

                if not file.endswith(".py") or file.startswith("__"):
                    continue

                rel = os.path.relpath(
                    os.path.join(root, file),
                    base_path,
                )

                ext = f"cmd.{rel.replace(os.sep,'.')[:-3]}"

                try:
                    await self.load_extension(ext)
                    print(f"[INFO] Loaded {ext}")
                    loaded += 1

                except Exception as exc:
                    print(f"[ERROR] Failed to load {ext}: {exc}")
                    failed += 1

        print(f"[SYSTEM] Extensions loaded: {loaded} | Failed: {failed}")

    # ─────────────────────────
    # READY EVENT
    # ─────────────────────────
    async def on_ready(self) -> None:

        print(f"[INFO] Logged in as {self.user} ({self.user.id})" # type: ignore
              )  # type: ignore

        try:
            await setup_verification_on_ready(self)
        except Exception as exc:
            print(f"[ERROR] Verification startup failed: {exc}")

        if self.presence_rotator is None:

            self.presence_rotator = PresenceRotator(self)

            await self.presence_rotator.start()

            print("[INFO] Presence rotator started")

        print("[INFO] Bot ready")

    # ─────────────────────────
    # MESSAGE PIPELINE
    # ─────────────────────────
    async def on_message(self, message: discord.Message) -> None:

        if message.guild is None or message.author.bot:
            return

        try:

            message.content = normalize_prefix(message.content)

            if message.content.isdigit():
                if await handle_counting(message):
                    return

            if message.attachments or message.embeds:
                if await enforce_media_only(message):
                    return

            await handle_sticky(message)

            if self.user and self.user.mentioned_in(message):
                await handle_bot_mention(self, message)

            await handle_afk(message)

        except Exception as exc:
            print(f"[ERROR] Message pipeline error: {exc}")

        await self.process_commands(message)


# ─────────────────────────
# ENTRYPOINT (RETRY SAFE)
# ─────────────────────────
def main() -> None:

    while True:

        bot = DigitalVigilBot()

        try:
            bot.run(TOKEN)  # type: ignore

        except discord.HTTPException as exc:

            if exc.status == 429:
                print(
                    "[WARN] Global rate limit detected. Waiting 60 seconds before reconnecting..."
                )
                time.sleep(60)
                continue

            raise

        except KeyboardInterrupt:
            print("[INFO] Shutdown requested")
            break

        except Exception as exc:
            print(f"[FATAL] Bot crashed: {exc}")
            print("[INFO] Restarting bot in 30 seconds...")
            time.sleep(30)


if __name__ == "__main__":
    main()
