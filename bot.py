import os
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

# region ENV
load_dotenv()

TOKEN = os.getenv("DISCORD_TOKEN")
if not TOKEN:
    raise RuntimeError("DISCORD_TOKEN not found in .env")

# region INTENTS
intents = discord.Intents.default()
intents.members = True
intents.message_content = True


# region BOT CLASS
class DigitalVigilBot(commands.Bot):

    def __init__(self) -> None:
        super().__init__(
            command_prefix=dynamic_prefix,
            intents=intents,
            help_command=None,
        )

        self.presence_rotator: SarcasticPresenceRotator | None = None

    # region SETUP HOOK
    async def setup_hook(self) -> None:

        # Initialize DB schema (async)
        await init_schema()

        # Global slash interaction guard
        self.tree.interaction_check = command_toggle_check

        # Load all extensions
        await self.load_all_extensions()

        # Sync slash commands
        await self.tree.sync()

        # Register persistent views (verification button)
        self.add_view(VerifyButtonView())

        print("[SYSTEM] Setup hook completed")

    # region EXTENSION LOADER
    async def load_all_extensions(self) -> None:
        base_path = os.path.abspath("cmd")

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
                    except Exception as exc:
                        print(f"[ERROR] Failed to load {ext}: {exc}")

    # region READY EVENT
    async def on_ready(self) -> None:

        print(f"[INFO] Logged in as {self.user} ({self.user.id})")

        # Restore verification state
        await setup_verification_on_ready(self)

        # Start presence rotator once
        if self.presence_rotator is None:
            self.presence_rotator = SarcasticPresenceRotator(self)
            await self.presence_rotator.start()
            print("[INFO] Presence rotator started")

        print("[INFO] Bot ready")

    # region MESSAGE PIPELINE
    async def on_message(self, message: discord.Message) -> None:

        if message.guild is None:
            return

        # Normalize custom prefix
        message.content = normalize_prefix(message.content)

        # Counting game
        if await handle_counting(message):
            return

        # Media-only enforcement
        if await enforce_media_only(message):
            return

        # Sticky system
        await handle_sticky(message)

        # Bot mention response
        await handle_bot_mention(self, message)

        # AFK system
        await handle_afk(message)

        # Process prefix commands
        await self.process_commands(message)


# region ENTRYPOINT
def main() -> None:
    bot = DigitalVigilBot()

    try:
        bot.run(TOKEN)
    except KeyboardInterrupt:
        print("[INFO] Shutdown requested")


if __name__ == "__main__":
    main()
