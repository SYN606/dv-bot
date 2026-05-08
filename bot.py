import os
import time
import asyncio
import logging

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
    value = os.getenv(key)

    if value is None:
        return default

    return value.lower() in ("1", "true", "yes")


SYNC_COMMANDS = env_bool("SYNC_COMMANDS", True)
DEBUG_HTTP = env_bool("DEBUG_HTTP", False)

if not TOKEN:
    raise RuntimeError("DISCORD_TOKEN not found in environment")

# LOGGING
logging.basicConfig(
    level=logging.INFO,
    format="[%(levelname)s] %(message)s",
)

logger = logging.getLogger("digitalvigil")

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
            case_insensitive=True,
        )

        self.presence_rotator: PresenceRotator | None = None

    # SETUP HOOK
    async def setup_hook(self) -> None:

        logger.info("[STARTUP] Initializing database schema...")
        await init_schema()
        self.tree.interaction_check = command_toggle_check
        await self.load_all_extensions()
        logger.info(f"[STARTUP] Loaded {len(self.extensions)} extensions")

        # COMMAND SYNC
        if SYNC_COMMANDS:
            try:

                if ENV == "test" and DEV_GUILD_ID:
                    guild = discord.Object(id=int(DEV_GUILD_ID))
                    logger.info(
                        "[SYNC] Syncing commands to development guild...")
                    self.tree.copy_global_to(guild=guild)
                    synced = await self.tree.sync(guild=guild)
                    logger.info(f"[SYNC] Synced {len(synced)} guild commands")
                else:
                    logger.info("[SYNC] Syncing global commands...")
                    synced = await self.tree.sync()
                    logger.info(f"[SYNC] Synced {len(synced)} global commands")
            except Exception as exc:
                logger.exception(f"[SYNC ERROR] {exc}")
        else:
            logger.info("[SYNC] Command sync disabled")
        # Persistent Views
        self.add_view(VerifyButtonView())

    # EXTENSION LOADER
    async def load_all_extensions(self) -> None:
        base_path = os.path.abspath("cmd")
        for root, _, files in os.walk(base_path):
            for file in files:
                if not file.endswith(".py"):
                    continue
                if file.startswith("__"):
                    continue
                rel = os.path.relpath(
                    os.path.join(root, file),
                    base_path,
                )
                rel_path = (rel.replace(os.sep, ".").removesuffix(".py"))
                extension = f"cmd.{rel_path}"
                try:
                    await self.load_extension(extension)
                    logger.info(f"[EXTENSION] Loaded → {extension}")

                except Exception as exc:
                    logger.exception(
                        f"[EXTENSION ERROR] Failed to load {extension}: {exc}")

    # READY
    async def on_ready(self) -> None:

        logger.info(f"[READY] Logged in as {self.user} ({self.user.id})") # type: ignore

        try:
            await setup_verification_on_ready(self)

        except Exception as exc:
            logger.exception(f"[VERIFICATION STARTUP ERROR] {exc}")

        # Prevent duplicate startup
        if self.presence_rotator is None:

            self.presence_rotator = PresenceRotator(self)

            await self.presence_rotator.start()

        logger.info("[READY] Bot is fully operational")

    # MESSAGE PIPELINE
    async def on_message(
        self,
        message: discord.Message,
    ) -> None:

        if message.author.bot:
            return

        if not message.guild:
            return

        try:

            message.content = normalize_prefix(message.content)

            # MEDIA ONLY
            if await enforce_media_only(message):
                return

            # STICKY
            await handle_sticky(message)

            # BOT MENTION
            if self.user and self.user.mentioned_in(message):

                await handle_bot_mention(
                    self,
                    message,
                )

        except Exception as exc:
            logger.exception(f"[PIPELINE ERROR] {exc}")

        # COMMANDS
        await self.process_commands(message)

        # AFK AFTER COMMANDS
        try:
            await handle_afk(message)

        except Exception as exc:
            logger.exception(f"[AFK ERROR] {exc}")

    # UNKNOWN COMMANDS + COMMAND ERRORS
    async def on_command_error(
        self,
        ctx: commands.Context,
        error: commands.CommandError,
    ) -> None:

        # Original error
        error = getattr(error, "original", error)

        # COMMAND NOT FOUND
        if isinstance(error, commands.CommandNotFound):
            await ctx.send(
                f"Unknown command. Use `{ctx.clean_prefix}help` to view commands.",
                # delete_after=6,
            )
            return

        # MISSING ARGUMENTS
        if isinstance(error, commands.MissingRequiredArgument):
            await ctx.send(
                f"Missing argument: `{error.param.name}`",
                # delete_after=8,
            )
            return

        # MISSING PERMISSIONS
        if isinstance(error, commands.MissingPermissions):
            await ctx.send(
                "You don't have permission to use this command. || SKILL ISSUE",
                # delete_after=8,
            )
            return

        # BOT MISSING PERMISSIONS
        if isinstance(
                error,
                commands.BotMissingPermissions,
        ):
            perms = ", ".join(error.missing_permissions)
            await ctx.send(
                f"I am missing permissions: `{perms}`",
                delete_after=10,
            )
            return

        # COOLDOWN
        if isinstance(error, commands.CommandOnCooldown):
            await ctx.send(
                f"Slow down. Try again in `{error.retry_after:.1f}s`",
                delete_after=6,
            )
            return

        # CHECK FAILURE
        if isinstance(error, commands.CheckFailure):
            return

        # UNHANDLED
        logger.exception(f"[COMMAND ERROR] {ctx.command}: {error}")
        try:
            await ctx.send(
                "Something went wrong while executing the command.",
                delete_after=8,
            )
        except Exception:
            pass

    # CLEAN SHUTDOWN
    async def close(self) -> None:
        logger.info("[SHUTDOWN] Closing bot...")
        try:
            await close_database()
            logger.info("[SHUTDOWN] Database closed")

        except Exception as exc:
            logger.exception(f"[SHUTDOWN ERROR] {exc}")

        await super().close()


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
            logger.info("\n[SHUTDOWN] CTRL+C detected")
            try:
                asyncio.run(close_database())
            except Exception:
                pass
            logger.info("[EXIT] Shutdown complete")
            break

        except discord.HTTPException as exc:
            if exc.status == 429:
                logger.warning("[RATE LIMIT] Hit Discord rate limit. "
                               "Retrying in 60 seconds...")
                time.sleep(60)
                continue

            logger.exception(f"[HTTP ERROR] {exc}")
            time.sleep(15)

        except Exception as exc:
            logger.exception(f"[CRASH] Unhandled exception: {exc}")
            try:
                asyncio.run(close_database())
            except Exception:
                pass
            logger.info("[RESTART] Restarting in 30 seconds...")
            time.sleep(30)


# RUN
if __name__ == "__main__":
    main()
