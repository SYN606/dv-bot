import os
import logging
import time
import asyncio
import discord
from discord.ext import commands
from dotenv import load_dotenv

from db.schema import init_schema
from db.engine import close_database

from utils.handlers.prefix import dynamic_prefix, normalize_prefix
from utils.core.interaction_check import command_toggle_check

from utils.handlers.media_only import enforce_media_only
from utils.handlers.sticky.sticky_handler import handle_sticky
from utils.handlers.afk_handler import handle_afk
from utils.handlers.mention import handle_bot_mention

from utils.core.presence import PresenceRotator
from utils.startups.verification_startup import setup_verification_on_ready
from utils.views.verification_views.verify_button_view import VerifyButtonView

# ENV
env_loaded = load_dotenv()

TOKEN = os.getenv("DISCORD_TOKEN")

if not env_loaded:
    ENV = "dev"
    print("[ENV] .env not found → running in DEV mode")
else:
    ENV = os.getenv("ENV", "prod").lower()

DEV_GUILD_ID = os.getenv("DEV_GUILD_ID")


def env_bool(key: str, default: bool) -> bool:
    val = os.getenv(key)
    if val is None:
        return default
    return val.lower() in ("true", "1", "yes")


SYNC_COMMANDS = env_bool("SYNC_COMMANDS", True)
DEBUG_HTTP = env_bool("DEBUG_HTTP", False)

if not TOKEN:
    raise RuntimeError("DISCORD_TOKEN not found in environment")

# LOGGING
logging.basicConfig(
    level=logging.INFO,
    format="[%(levelname)s] %(message)s",
)

logger = logging.getLogger("bot")

if DEBUG_HTTP:
    logging.getLogger("discord.http").setLevel(logging.DEBUG)

logger.info(f"[ENV] Running in {ENV.upper()} mode")

# INTENTS
intents = discord.Intents.default()
intents.members = True
intents.message_content = True


# BOT CLASS
class DigitalVigilBot(commands.Bot):

    def __init__(self) -> None:
        super().__init__(
            command_prefix=dynamic_prefix,
            intents=intents,
            help_command=None,
        )

        self.presence_rotator: PresenceRotator | None = None

    async def setup_hook(self) -> None:
        await init_schema()
        self.tree.interaction_check = command_toggle_check

        await self.load_all_extensions()

        logger.info(f"Tree commands before sync: {self.tree.get_commands()}")

        if SYNC_COMMANDS:
            try:
                if ENV == "test" and DEV_GUILD_ID:
                    guild = discord.Object(id=int(DEV_GUILD_ID))
                    logger.info("[DEV MODE] Syncing commands to dev guild...")
                    self.tree.copy_global_to(guild=guild)
                    synced = await self.tree.sync(guild=guild)
                    logger.info(f"[DEV MODE] Synced {len(synced)} commands")
                else:
                    logger.info("[PROD MODE] Syncing globally...")
                    synced = await self.tree.sync()
                    logger.info(f"[PROD MODE] Synced {len(synced)} commands")
            except Exception as exc:
                logger.error(f"Command sync failed: {exc}")
        else:
            logger.info("Command sync disabled via ENV")

        self.add_view(VerifyButtonView())

    async def load_all_extensions(self) -> None:
        base_path = os.path.abspath("cmd")

        for root, _, files in os.walk(base_path):
            for file in files:
                if not file.endswith(".py") or file.startswith("__"):
                    continue

                rel = os.path.relpath(os.path.join(root, file), base_path)
                rel_path = rel.replace(os.sep, ".").removesuffix(".py")
                ext = f"cmd.{rel_path}"

                try:
                    await self.load_extension(ext)
                    logger.info(f"Loaded extension: {ext}")
                except Exception as exc:
                    logger.error(f"Failed to load {ext}: {exc}")

    async def on_ready(self) -> None:
        logger.info(f"Logged in as {self.user}")

        try:
            await setup_verification_on_ready(self)
        except Exception as exc:
            logger.error(f"Verification startup failed: {exc}")

        # Prevent duplicate rotator start
        if self.presence_rotator is None:
            self.presence_rotator = PresenceRotator(self)
            await self.presence_rotator.start()

        logger.info("Bot ready")

    async def on_message(self, message: discord.Message) -> None:

        if message.guild is None or message.author.bot:
            return

        try:
            message.content = normalize_prefix(message.content)

            # MEDIA FILTER FIRST
            if await enforce_media_only(message):
                return

            await handle_sticky(message)

            if self.user and self.user.mentioned_in(message):
                await handle_bot_mention(self, message)

        except Exception as exc:
            logger.error(f"[PIPELINE ERROR] {exc}")

        # COMMANDS FIRST
        await self.process_commands(message)

        # AFK AFTER COMMANDS 
        try:
            await handle_afk(message)
        except Exception as exc:
            logger.error(f"[AFK ERROR] {exc}")


# ENTRYPOINT
def main() -> None:

    while True:
        bot = DigitalVigilBot()

        try:
            logger.info("[STARTUP] Starting bot...")
            bot.run(TOKEN)  # type: ignore 

            logger.info("[EXIT] Bot stopped normally")
            break

        except KeyboardInterrupt:
            logger.info("\n[SHUTDOWN] CTRL+C detected — shutting down...")

            try:
                asyncio.run(close_database())
                logger.info("[SHUTDOWN] Database connection closed")
            except Exception as e:
                logger.warning(f"[SHUTDOWN] DB close failed: {e}")

            break

        except discord.HTTPException as exc:
            if exc.status == 429:
                logger.warning("[RATE LIMIT] Hit 429. Retrying in 60s...")
                try:
                    time.sleep(60)
                except KeyboardInterrupt:
                    raise
                continue
            raise

        except Exception as exc:
            logger.error(f"[CRASH] Bot crashed: {exc}")

            try:
                asyncio.run(close_database())
                logger.info("[CLEANUP] Database closed after crash")
            except Exception:
                pass

            logger.info("[RESTART] Restarting in 30 seconds...")

            try:
                time.sleep(30)
            except KeyboardInterrupt:
                raise


if __name__ == "__main__":
    main()
