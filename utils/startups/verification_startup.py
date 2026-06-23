import logging
import discord
from db.db_helpers.verification import (get_verification_config)
from utils.views.verification_views.verify_button_view import (VerifyButtonView)

logger = logging.getLogger("Digital Vigital")


# VERIFICATION STARTUP
async def startup(bot: discord.Client, ) -> None:
    logger.info("[VERIFICATION] Initializing verification system...")

    try:
        bot.add_view(VerifyButtonView())
        logger.info("[VERIFICATION] Persistent verification view registered")
    except Exception as exc:
        logger.exception(
            f"[VERIFICATION] Failed to register VerifyButtonView: {exc}")
        return
    loaded = 0
    for guild in bot.guilds:
        try:
            config = await get_verification_config(guild.id)

        except Exception as exc:
            logger.exception(f"[VERIFICATION] "
                             f"Failed loading config for "
                             f"{guild.name} "
                             f"({guild.id}): {exc}")
            continue
        if not config:
            continue
        logger.info(f"[VERIFICATION] "
                    f"Guild={guild.name} "
                    f"verify_channel="
                    f"{config.verify_channel_id} "
                    f"verified_role="
                    f"{config.verified_role_id}")
        loaded += 1
    logger.info(
        f"[VERIFICATION] Loaded verification configs for {loaded} guilds")
