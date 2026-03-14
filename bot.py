import os
import asyncio
import logging
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
# GLOBAL API GUARD
# ─────────────────────────
_api_calls = []
API_LIMIT = 40


async def api_guard():
    now = asyncio.get_event_loop().time()

    _api_calls.append(now)

    while _api_calls and now - _api_calls[0] > 1:
        _api_calls.pop(0)

    if len(_api_calls) > API_LIMIT:
        await asyncio.sleep(0.8)


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

        # Persistent verification button
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
        print(f"[INFO] Logged in as {self.user} ({self.user.id})")  # type: ignore
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
    # GLOBAL COMMAND ERROR HANDLER
    # ─────────────────────────
    async def on_command_error(self, ctx: commands.Context, error):

        if isinstance(error, commands.CommandNotFound):
            return

        print(f"[ERROR] Command error: {error}")

        try:
            await api_guard()

            await ctx.reply(
                "⚠ An unexpected error occurred while executing that command.",
                mention_author=False,
            )

        except Exception:
            pass

    # ─────────────────────────
    # MESSAGE PIPELINE
    # Optimized to reduce handler load
    # ─────────────────────────
    async def on_message(self, message: discord.Message) -> None:

        if message.guild is None or message.author.bot:
            return

        try:

            message.content = normalize_prefix(message.content)

            # Counting only if numeric
            if message.content.isdigit():
                if await handle_counting(message):
                    return

            # Media-only only if message contains media
            if message.attachments or message.embeds:
                if await enforce_media_only(message):
                    return

            # Sticky system
            await handle_sticky(message)

            # Bot mention handler
            if self.user and self.user.mentioned_in(message):
                await handle_bot_mention(self, message)

            # AFK handler
            await handle_afk(message)

        except Exception as exc:
            print(f"[ERROR] Message pipeline error: {exc}")

        await self.process_commands(message)


# ─────────────────────────
# ENTRYPOINT
# ─────────────────────────
def main() -> None:

    bot = DigitalVigilBot()

    try:
        bot.run(TOKEN)  # type: ignore

    except KeyboardInterrupt:
        print("[INFO] Shutdown requested")

    except Exception as exc:
        print(f"[FATAL] Bot crashed: {exc}")


if __name__ == "__main__":
    main()
