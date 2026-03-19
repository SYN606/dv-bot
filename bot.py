import os
import logging
import time
import discord
from discord.ext import commands
from dotenv import load_dotenv

from db.schema import init_schema
from utils.handlers.prefix import dynamic_prefix, normalize_prefix
from utils.core.interaction_check import command_toggle_check

from utils.handlers.media_only import enforce_media_only
from utils.handlers.sticky_handler import handle_sticky
from utils.handlers.afk_handler import handle_afk
from utils.handlers.mention import handle_bot_mention

from utils.core.presence import PresenceRotator
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
logging.basicConfig(
    level=logging.INFO,
    format="[%(levelname)s] %(message)s",
)

logger = logging.getLogger("bot")

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
                logger.info("Slash commands synced")
            except Exception as exc:
                logger.warning(f"Slash sync failed: {exc}")

        self.add_view(VerifyButtonView())

    # ─────────────────────────
    # EXTENSION LOADER
    # ─────────────────────────
    async def load_all_extensions(self) -> None:

        base_path = os.path.abspath("cmd")

        for root, _, files in os.walk(base_path):
            for file in files:
                if not file.endswith(".py") or file.startswith("__"):
                    continue

                rel = os.path.relpath(
                    os.path.join(root, file),
                    base_path,
                )

                ext = f"cmd.{rel.replace(os.sep, '.')[:-3]}"

                try:
                    await self.load_extension(ext)
                except Exception as exc:
                    logger.error(f"Failed to load {ext}: {exc}")

    # ─────────────────────────
    # READY EVENT
    # ─────────────────────────
    async def on_ready(self) -> None:

        logger.info(f"Logged in as {self.user}")

        try:
            await setup_verification_on_ready(self)
        except Exception as exc:
            logger.error(f"Verification startup failed: {exc}")

        if self.presence_rotator is None:
            self.presence_rotator = PresenceRotator(self)
            await self.presence_rotator.start()

        logger.info("Bot ready")

    # ─────────────────────────
    # MESSAGE PIPELINE
    # ─────────────────────────
    async def on_message(self, message: discord.Message) -> None:

        if message.guild is None or message.author.bot:
            return

        try:
            message.content = normalize_prefix(message.content)

            if message.attachments or message.embeds:
                if await enforce_media_only(message):
                    return

            await handle_sticky(message)

            if self.user and self.user.mentioned_in(message):
                await handle_bot_mention(self, message)

            await handle_afk(message)

        except Exception as exc:
            logger.error(f"Message pipeline error: {exc}")

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
                logger.warning("Rate limited. Retrying in 60s...")
                time.sleep(60)
                continue

            raise

        except KeyboardInterrupt:
            logger.info("Shutdown requested")
            break

        except Exception as exc:
            logger.error(f"Bot crashed: {exc}")
            time.sleep(30)


if __name__ == "__main__":
    main()
