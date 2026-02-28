import os
import asyncio
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

from utils.presence import SarcasticPresenceRotator
from utils.startups.verification_startup import setup_verification_on_ready
from utils.views.verification_views.verify_button_view import VerifyButtonView

# ─────────────────────────
# ENV
# ─────────────────────────
load_dotenv()

TOKEN = os.getenv("DISCORD_TOKEN")
if not TOKEN:
    raise RuntimeError("DISCORD_TOKEN not found in .env")

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

        self.presence_rotator: SarcasticPresenceRotator | None = None

    # ─────────────────────────
    # SETUP HOOK
    # ─────────────────────────
    async def setup_hook(self) -> None:
        await init_schema()

        # Global slash command guard
        self.tree.interaction_check = command_toggle_check

        await self.load_all_extensions()

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
                if file.endswith(".py") and not file.startswith("__"):
                    rel = os.path.relpath(
                        os.path.join(root, file),
                        base_path,
                    )
                    ext = f"cmd.{rel.replace(os.sep, '.')[:-3]}"

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
        print(f"[INFO] Logged in as {self.user} ({self.user.id})")

        try:
            await setup_verification_on_ready(self)
        except Exception as exc:
            print(f"[ERROR] Verification startup failed: {exc}")

        if self.presence_rotator is None:
            self.presence_rotator = SarcasticPresenceRotator(self)
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
            await ctx.reply(
                "⚠ An unexpected error occurred while executing that command.",
                mention_author=False,
            )
        except Exception:
            pass

    # ─────────────────────────
    # MESSAGE PIPELINE
    # ─────────────────────────
    async def on_message(self, message: discord.Message) -> None:

        if message.guild is None or message.author.bot:
            return

        try:
            message.content = normalize_prefix(message.content)

            if await handle_counting(message):
                return

            if await enforce_media_only(message):
                return

            await handle_sticky(message)

            await handle_bot_mention(self, message)

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
        bot.run(TOKEN)
    except KeyboardInterrupt:
        print("[INFO] Shutdown requested")
    except Exception as exc:
        print(f"[FATAL] Bot crashed: {exc}")


if __name__ == "__main__":
    main()
