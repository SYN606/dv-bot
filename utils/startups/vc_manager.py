from utils.handlers.vc_mod_handlers.cleanup_handler import (cleanup_vc_tracking
                                                            )


async def startup(bot, ) -> None:

    print("[VC] Initializing VC manager...")
    for guild in bot.guilds:
        try:
            cleaned = await cleanup_vc_tracking(guild)

            print(
                f"[VC] Cleanup completed for {guild.name} (cleaned {cleaned})")
        except Exception as e:
            print(f"[VC ERROR] {guild.id}: {e}")
    print("[VC] VC manager initialized")
