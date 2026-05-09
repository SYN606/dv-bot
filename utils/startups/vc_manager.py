from utils.handlers.vc_mod_handlers.cache_handler import (
    build_guild_cache, )

from utils.handlers.vc_mod_handlers.cleanup_handler import (
    cleanup_vc_tracking, )


# Startup VC loader
async def startup_vc_manager(bot, ) -> None:

    for guild in bot.guilds:

        try:

            # Cleanup stale mappings
            await cleanup_vc_tracking(guild)

            # Build cache
            await build_guild_cache(guild.id)

            print(f"[VC] Loaded VC cache "
                  f"for {guild.name}")

        except Exception as e:

            print(f"[VC] Failed loading "
                  f"{guild.id}: {e}")
