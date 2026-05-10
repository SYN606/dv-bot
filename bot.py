import os
import time
import asyncio
import logging
import discord
import inspect
from discord.ext import commands
from dotenv import load_dotenv
from db.schema import init_schema
from db.engine import close_database
from utils.handlers.prefix import (
    dynamic_prefix,
    normalize_prefix,
)
from utils.core.interaction_check import (
    command_toggle_check,
)
from utils.handlers.media_only import (
    enforce_media_only,
)
from utils.handlers.sticky.sticky_handler import (
    handle_sticky,
)
from utils.handlers.afk_handler import (
    handle_afk,
)
from utils.handlers.mention import (
    handle_bot_mention,
)
from utils.core.presence import (
    PresenceRotator,
)


# ENV
env_loaded = load_dotenv()
TOKEN = os.getenv(
    "DISCORD_TOKEN",
)
if not env_loaded:
    ENV = "dev"
    print("[ENV] .env not found → running in DEV mode")
else:
    ENV = os.getenv(
        "ENV",
        "prod",
    ).lower()
DEV_GUILD_ID = os.getenv(
    "DEV_GUILD_ID",
)


def env_bool(
    key: str,
    default: bool,
) -> bool:

    value = os.getenv(key)
    if value is None:
        return default
    return value.lower() in (
        "1",
        "true",
        "yes",
    )


SYNC_COMMANDS = env_bool(
    "SYNC_COMMANDS",
    True,
)

DEBUG_HTTP = env_bool(
    "DEBUG_HTTP",
    False,
)

if not TOKEN:
    raise RuntimeError("DISCORD_TOKEN not found in environment")

# LOGGING
logging.basicConfig(
    level=logging.INFO,
    format="[%(levelname)s] %(message)s",
)

logger = logging.getLogger(
    "Digital Vigil",
)

if DEBUG_HTTP:
    logging.getLogger(
        "discord.http",
    ).setLevel(logging.DEBUG)

logger.info(f"[ENV] Running in {ENV.upper()} mode")

# INTENTS
intents = discord.Intents.default()
intents.members = True
intents.message_content = True
intents.voice_states = True


# BOT CLASS
class DigitalVigilBot(
    commands.Bot,
):
    def __init__(
        self,
    ) -> None:
        super().__init__(
            command_prefix=dynamic_prefix,
            intents=intents,
            help_command=None,
            case_insensitive=True,
        )
        self.presence_rotator: PresenceRotator | None = None

    # SETUP HOOK
    async def setup_hook(
        self,
    ) -> None:
        logger.info("[STARTUP] Initializing database schema...")
        await init_schema()
        self.tree.interaction_check = command_toggle_check
        # Load commands
        await self.load_all_extensions()
        # Load startup modules
        await self.load_startup_modules()
        logger.info(f"[STARTUP] Loaded {len(self.extensions)} extensions")
        # COMMAND SYNC
        if SYNC_COMMANDS:
            try:
                if ENV == "test" and DEV_GUILD_ID:
                    guild = discord.Object(
                        id=int(
                            DEV_GUILD_ID,
                        )
                    )
                    logger.info("[SYNC] Syncing commands to development guild...")
                    self.tree.copy_global_to(
                        guild=guild,
                    )
                    synced = await self.tree.sync(
                        guild=guild,
                    )
                    logger.info(f"[SYNC] Synced {len(synced)} guild commands")
                else:
                    logger.info("[SYNC] Syncing global commands...")
                    synced = await self.tree.sync()
                    logger.info(f"[SYNC] Synced {len(synced)} global commands")
            except Exception as exc:
                logger.exception(f"[SYNC ERROR] {exc}")
        else:
            logger.info("[SYNC] Command sync disabled")

    # EXTENSION LOADER
    async def load_all_extensions(
        self,
    ) -> None:
        base_path = os.path.abspath(
            "cmd",
        )
        for root, _, files in os.walk(
            base_path,
        ):
            for file in files:
                if not file.endswith(".py"):
                    continue
                if file.startswith("__"):
                    continue
                rel = os.path.relpath(
                    os.path.join(
                        root,
                        file,
                    ),
                    base_path,
                )
                rel_path = rel.replace(
                    os.sep,
                    ".",
                ).removesuffix(".py")
                extension = f"cmd.{rel_path}"
                try:
                    await self.load_extension(
                        extension,
                    )
                    logger.info(f"[EXTENSION] Loaded → {extension}")
                except Exception as exc:
                    logger.exception(
                        f"[EXTENSION ERROR] Failed to load {extension}: {exc}"
                    )

    # STARTUP MODULE LOADER
    async def load_startup_modules(
        self,
    ) -> None:

        base_path = os.path.abspath(
            "utils/startups",
        )

        if not os.path.exists(
            base_path,
        ):
            logger.warning("[STARTUP] utils/startups folder not found")

            return

        for root, _, files in os.walk(
            base_path,
        ):
            for file in files:
                # Ignore non-python files
                if not file.endswith(".py"):
                    continue

                # Ignore __init__.py
                if file.startswith("__"):
                    continue

                rel = os.path.relpath(
                    os.path.join(
                        root,
                        file,
                    ),
                    base_path,
                )

                rel_path = rel.replace(
                    os.sep,
                    ".",
                ).removesuffix(".py")

                module = f"utils.startups.{rel_path}"

                try:
                    startup_module = __import__(
                        module,
                        fromlist=["startup"],
                    )

                    startup_func = getattr(
                        startup_module,
                        "startup",
                        None,
                    )

                    # Skip invalid startup modules
                    if startup_func is None:
                        logger.warning(f"[STARTUP] {module} has no 'startup' function")

                        continue

                    # Ensure coroutine function
                    if not inspect.iscoroutinefunction(
                        startup_func,
                    ):
                        logger.warning(f"[STARTUP] {module}.startup is not async")

                        continue

                    # Execute startup
                    await startup_func(
                        self,
                    )

                    logger.info(f"[STARTUP] Loaded → {module}")

                except Exception as exc:
                    logger.exception(f"[STARTUP ERROR] {module}: {exc}")

    # READY
    async def on_ready(
        self,
    ) -> None:
        logger.info(
            f"[READY] Logged in as {self.user} ({self.user.id})"  # type: ignore
        )
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
            message.content = normalize_prefix(
                message.content,
            )
            # MEDIA ONLY
            if await enforce_media_only(
                message,
            ):
                return

            # STICKY
            await handle_sticky(
                message,
            )

            # BOT MENTION
            if self.user and self.user.mentioned_in(
                message,
            ):
                await handle_bot_mention(
                    self,
                    message,
                )
        except Exception as exc:
            logger.exception(f"[PIPELINE ERROR] {exc}")
        # COMMANDS
        await self.process_commands(
            message,
        )
        # AFK AFTER COMMANDS
        try:
            await handle_afk(
                message,
            )
        except Exception as exc:
            logger.exception(f"[AFK ERROR] {exc}")

    # COMMAND ERRORS
    async def on_command_error(
        self,
        ctx: commands.Context,
        error: commands.CommandError,
    ) -> None:
        error = getattr(
            error,
            "original",
            error,
        )
        if isinstance(
            error,
            commands.CommandNotFound,
        ):
            return
        if isinstance(
            error,
            commands.MissingRequiredArgument,
        ):
            await ctx.send(f"Missing argument: `{error.param.name}`")
            return
        if isinstance(
            error,
            commands.MissingPermissions,
        ):
            await ctx.send("You don't have permission to use this command.")
            return
        if isinstance(
            error,
            commands.BotMissingPermissions,
        ):
            perms = ", ".join(
                error.missing_permissions,
            )
            await ctx.send(f"I am missing permissions: `{perms}`")
            return
        if isinstance(
            error,
            commands.CommandOnCooldown,
        ):
            await ctx.send(f"Slow down. Try again in `{error.retry_after:.1f}s`")
            return
        if isinstance(
            error,
            commands.CheckFailure,
        ):
            return
        logger.exception(f"[COMMAND ERROR] {ctx.command}: {error}")
        try:
            await ctx.send("Something went wrong while executing the command.")
        except Exception:
            pass

    # CLEAN SHUTDOWN
    async def close(
        self,
    ) -> None:
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
                asyncio.run(
                    close_database(),
                )
            except Exception:
                pass
            logger.info("[EXIT] Shutdown complete")
            break

        except discord.HTTPException as exc:
            if exc.status == 429:
                logger.warning(
                    "[RATE LIMIT] Hit Discord rate limit. Retrying in 60 seconds..."
                )
                time.sleep(60)
                continue
            logger.exception(f"[HTTP ERROR] {exc}")
            time.sleep(15)

        except Exception as exc:
            logger.exception(f"[CRASH] Unhandled exception: {exc}")
            try:
                asyncio.run(
                    close_database(),
                )
            except Exception:
                pass

            logger.info("[RESTART] Restarting in 30 seconds...")
            time.sleep(30)


# RUN
if __name__ == "__main__":
    main()
