import asyncio
import inspect
import logging
import os
import time
from typing import cast

import discord
from discord.ext import commands
from dotenv import load_dotenv

# Tortoise ORM Database Infrastructure
from db.db_config import close_tortoise, init_tortoise

# Custom Handlers & Feature Interceptors
from utils.core.embeds import make_embed
from utils.core.interaction_check import command_toggle_check

# Core System Utilities
from utils.core.presence import PresenceRotator
from utils.handlers.afk_handler import handle_afk
from utils.handlers.autoresponder_handler import handle_autoresponder
from utils.handlers.media_only import enforce_media_only
from utils.handlers.mention import handle_bot_mention
from utils.handlers.prefix import dynamic_prefix, normalize_prefix
from utils.handlers.sticky.sticky_handler import handle_sticky
from utils.handlers.vc_mod_handlers.vc_role_handler import handle_voice_state_update  # <-- Import your VC Handler

# Load Environment Variables
env_loaded = load_dotenv()
TOKEN = os.getenv("DISCORD_TOKEN")

if not env_loaded:
    ENV = "dev"
    print("[ENV] .env file not found → running in DEV mode")
else:
    ENV = os.getenv("ENV", "prod").lower()

DEV_GUILD_ID = os.getenv("DEV_GUILD_ID")


def env_bool(key: str, default: bool) -> bool:
    value = os.getenv(key)
    if value is None:
        return default
    return value.lower() in ("1", "true", "yes")


SYNC_COMMANDS = env_bool("SYNC_COMMANDS", default=True)
DEBUG_HTTP = env_bool("DEBUG_HTTP", default=False)

if not TOKEN:
    raise RuntimeError("DISCORD_TOKEN not found in environment variables.")

# Logging Initialization
logging.basicConfig(level=logging.INFO, format="[%(levelname)s] %(message)s")
logger = logging.getLogger("DigitalVigil")

if DEBUG_HTTP:
    logging.getLogger("discord.http").setLevel(logging.DEBUG)

logger.info(f"[ENV] Running in {ENV.upper()} mode")

# Gateway Intents Mapping
intents = discord.Intents.default()
intents.members = True
intents.message_content = True
intents.invites = True
intents.voice_states = True  # REQUIRED for voice channel tracking


class DigitalVigilBot(commands.Bot):
    """Main application bot class with dynamic extensions and custom event pipeline."""

    def __init__(self) -> None:
        super().__init__(
            command_prefix=dynamic_prefix,
            intents=intents,
            help_command=None,
            case_insensitive=True,
        )
        self.presence_rotator: PresenceRotator | None = None

    async def setup_hook(self) -> None:
        logger.info(
            "[STARTUP] Initializing Tortoise ORM database connection...")
        await init_tortoise()

        self.tree.interaction_check = command_toggle_check

        await self.load_all_extensions()
        await self.load_startup_modules()
        logger.info(f"[STARTUP] Loaded {len(self.extensions)} extensions")

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
                    logger.info(
                        "[SYNC] Syncing global application commands...")
                    synced = await self.tree.sync()
                    logger.info(f"[SYNC] Synced {len(synced)} global commands")
            except Exception as exc:
                logger.exception(
                    f"[SYNC ERROR] Command synchronization failed: {exc}")
        else:
            logger.info("[SYNC] Application command sync disabled in config")

    async def load_all_extensions(self) -> None:
        """Recursively loads all extension cogs inside the /cmd directory."""
        base_path = os.path.abspath("cmd")
        if not os.path.exists(base_path):
            logger.warning("[EXTENSION] Directory 'cmd' not found.")
            return

        for root, _, files in os.walk(base_path):
            for file in files:
                if not file.endswith(".py") or file.startswith("__"):
                    continue

                rel = os.path.relpath(os.path.join(root, file), base_path)
                rel_path = rel.replace(os.sep, ".").removesuffix(".py")
                extension = f"cmd.{rel_path}"

                try:
                    await self.load_extension(extension)
                    logger.info(f"[EXTENSION] Loaded → {extension}")
                except Exception as exc:
                    logger.exception(
                        f"[EXTENSION ERROR] Failed to load {extension}: {exc}")

    async def load_startup_modules(self) -> None:
        """Dynamically imports and executes asynchronous startup tasks from /utils/startups."""
        base_path = os.path.abspath("utils/startups")

        if not os.path.exists(base_path):
            logger.warning("[STARTUP] Folder 'utils/startups' not found")
            return

        for root, _, files in os.walk(base_path):
            for file in files:
                if not file.endswith(".py") or file.startswith("__"):
                    continue

                rel = os.path.relpath(os.path.join(root, file), base_path)
                rel_path = rel.replace(os.sep, ".").removesuffix(".py")
                module_name = f"utils.startups.{rel_path}"

                try:
                    startup_module = __import__(module_name,
                                                fromlist=["startup"])
                    startup_func = getattr(startup_module, "startup", None)

                    if startup_func is None:
                        logger.warning(
                            f"[STARTUP] {module_name} has no 'startup' function defined"
                        )
                        continue

                    if not inspect.iscoroutinefunction(startup_func):
                        logger.warning(
                            f"[STARTUP] {module_name}.startup is not an async coroutine"
                        )
                        continue

                    await startup_func(self)
                    logger.info(f"[STARTUP] Loaded → {module_name}")
                except Exception as exc:
                    logger.exception(f"[STARTUP ERROR] {module_name}: {exc}")

    async def on_ready(self) -> None:
        client_user = cast(discord.ClientUser, self.user)
        logger.info(f"[READY] Logged in as {client_user} ({client_user.id})")

        if self.presence_rotator is None:
            self.presence_rotator = PresenceRotator(self)
            self.presence_rotator.start()

        logger.info("[READY] Application engine operational")

    # VOICE STATE PIPELINE
    async def on_voice_state_update(self, member: discord.Member,
                                    before: discord.VoiceState,
                                    after: discord.VoiceState) -> None:
        """Handles voice state triggers (e.g., auto-assigning VC roles)."""
        if member.bot:
            return

        try:
            await handle_voice_state_update(member, before, after)
        except Exception as exc:
            logger.exception(f"[VC ERROR] Voice state update failed: {exc}")

    # MESSAGE PIPELINE
    async def on_message(self, message: discord.Message) -> None:
        if message.author.bot or not message.guild:
            return

        try:
            message.content = normalize_prefix(message.content)

            if await enforce_media_only(message):
                return

            await handle_sticky(message)

            if await handle_autoresponder(self, message):
                return

            if self.user and self.user.mentioned_in(message):
                await handle_bot_mention(self, message)

        except Exception as exc:
            logger.exception(f"[PIPELINE ERROR] Interceptor failure: {exc}")

        await self.process_commands(message)

        try:
            await handle_afk(message)
        except Exception as exc:
            logger.exception(f"[AFK ERROR] Handler failure: {exc}")

    async def on_command_error(self, ctx: commands.Context,
                               error: commands.CommandError) -> None:
        error = getattr(error, "original", error)

        if isinstance(error, commands.CommandNotFound):
            invoked_with = ctx.invoked_with or "Unknown"
            try:
                await ctx.send(
                    embed=make_embed(
                        title="Command Not Found",
                        description=
                        (f"The command `{invoked_with}` does not exist. "
                         "Use `/` slash commands to browse available systems."
                         ),
                        level="WARNING",
                        footer=f"Requested by {ctx.author}",
                    ),
                    delete_after=10.0,
                )
            except Exception:
                pass
            return

        if isinstance(error, commands.MissingRequiredArgument):
            await ctx.send(f"Missing required argument: `{error.param.name}`")
            return

        if isinstance(error, commands.MissingPermissions):
            await ctx.send(
                "You do not have permission to execute this command.")
            return

        if isinstance(error, commands.BotMissingPermissions):
            missing_perms = ", ".join(error.missing_permissions)
            await ctx.send(
                f"I am missing necessary permissions: `{missing_perms}`")
            return

        if isinstance(error, commands.CommandOnCooldown):
            await ctx.send(
                f"Slow down! Try again in `{error.retry_after:.1f}s`")
            return

        if isinstance(error, commands.CheckFailure):
            return

        logger.exception(f"[COMMAND ERROR] In '{ctx.command}': {error}")
        try:
            await ctx.send("Something went wrong while processing the command."
                           )
        except Exception:
            pass

    async def close(self) -> None:
        logger.info("[SHUTDOWN] Closing bot processes...")
        if self.presence_rotator:
            self.presence_rotator.stop()

        try:
            await close_tortoise()
            logger.info("[SHUTDOWN] Tortoise ORM cleanly disconnected")
        except Exception as exc:
            logger.exception(f"[SHUTDOWN ERROR] Database closure error: {exc}")

        await super().close()


async def run_bot() -> bool:
    """Runs a single iteration of the bot lifecycle. Returns False if requested stop/cancelled."""
    bot = DigitalVigilBot()
    try:
        logger.info("[STARTUP] Starting bot engine...")
        await bot.start(cast(str, TOKEN))
        logger.info("[EXIT] Bot stopped normally")
        return False
    except asyncio.CancelledError:
        logger.info("\n[SHUTDOWN] Cancellation received. Cleaning up...")
        await bot.close()
        return False
    except discord.HTTPException as exc:
        if exc.status == 429:
            logger.warning(
                "[RATE LIMIT] Hit Discord API rate limit. Backing off for 60 seconds..."
            )
            time.sleep(60)
            return True
        logger.exception(f"[HTTP ERROR] {exc}")
        time.sleep(15)
        return True
    except Exception as exc:
        logger.exception(f"[CRASH] Unhandled exception occurred: {exc}")
        try:
            await close_tortoise()
        except Exception:
            pass
        logger.info("[RESTART] Restarting iteration loop in 30 seconds...")
        time.sleep(30)
        return True


def main() -> None:
    """Main execution loop wrapping the asynchronous run lifecycle."""
    should_restart = True
    while should_restart:
        try:
            should_restart = asyncio.run(run_bot())
        except KeyboardInterrupt:
            logger.info(
                "\n[SHUTDOWN] KeyboardInterrupt (CTRL+C) detected. Terminating..."
            )
            try:
                asyncio.run(close_tortoise())
            except Exception:
                pass
            logger.info("[EXIT] Shutdown complete cleanly")
            break


if __name__ == "__main__":
    main()
