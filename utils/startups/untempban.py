from __future__ import annotations

import logging
import discord
from discord.ext import tasks
from db.db_helpers.tempban import get_expired_tempbans, remove_tempban, get_tempban_role
from db.db_helpers.verification import get_verification_config
from utils.logging.mod_log import send_mod_log

logger = logging.getLogger("Digital Vigital")


class TempbanBackgroundHandler:

    def __init__(self, bot: discord.Client):
        self.bot = bot
        self.auto_unban_check.start()

    def stop(self):
        self.auto_unban_check.cancel()

    @tasks.loop(seconds=15)
    async def auto_unban_check(self):
        try:
            if not self.bot.user:
                return

            bot_user_id = self.bot.user.id
            expired_records = await get_expired_tempbans()
            if not expired_records:
                return

            for record in expired_records:
                guild = self.bot.get_guild(record.guild_id)
                if not guild:
                    # Guild no longer exists / bot left; deactivate record to prevent infinite loop
                    await remove_tempban(
                        guild_id=record.guild_id,
                        user_id=record.user_id,
                        moderator_id=bot_user_id,
                    )
                    continue

                # Fetch or resolve target member safely across cache & API
                member = guild.get_member(record.user_id)
                if not member:
                    try:
                        member = await guild.fetch_member(record.user_id)
                    except discord.NotFound:
                        # User left the server during tempban; clear record cleanly
                        await remove_tempban(
                            guild_id=guild.id,
                            user_id=record.user_id,
                            moderator_id=bot_user_id,
                        )
                        continue
                    except discord.HTTPException as err:
                        logger.error(
                            f"[TEMPBAN] Failed fetching member {record.user_id} in {guild.id}: {err}"
                        )
                        continue

                role_id = await get_tempban_role(guild.id)
                tempban_role = guild.get_role(role_id) if role_id else None

                # Check bot management permissions
                if not guild.me or not guild.me.guild_permissions.manage_roles:
                    logger.warning(
                        f"[TEMPBAN] Cannot untempban {member.id} in {guild.id}: Missing Manage Roles."
                    )
                    continue

                action_successful = False

                try:
                    # 1. Remove isolation role if assigned
                    if tempban_role and tempban_role in member.roles:
                        await member.remove_roles(
                            tempban_role,
                            reason="Tempban automatically expired.",
                        )

                    # 2. Restore verified role if applicable
                    config = await get_verification_config(guild.id)
                    if config and config.verified_role_id:
                        verified_role = guild.get_role(config.verified_role_id)
                        if verified_role and verified_role not in member.roles:
                            await member.add_roles(
                                verified_role,
                                reason=
                                "Restoring verified status (Tempban expired).",
                            )

                    action_successful = True

                except discord.Forbidden:
                    logger.warning(
                        f"[TEMPBAN] Failed untempbanning {member.id} in {guild.id}: Role hierarchy too low."
                    )
                except discord.HTTPException as e:
                    logger.error(
                        f"[TEMPBAN] API error untempbanning {member.id} in {guild.id}: {e}"
                    )

                if action_successful:
                    await remove_tempban(
                        guild_id=guild.id,
                        user_id=member.id,
                        moderator_id=bot_user_id,
                    )

                    try:
                        await send_mod_log(
                            guild=guild,
                            category="MODERATION",
                            title="Tempban Automatically Expired",
                            description=
                            f"Active tempban duration for {member.mention} has ended.",
                            level="SUCCESS",
                            actor=guild.me,
                            target=member,
                        )
                    except Exception as log_error:
                        logger.error(
                            f"[TEMPBAN] Failed sending mod log for {member.id}: {log_error}"
                        )

        except Exception as e:
            logger.error(
                f"[TEMPBAN] Error in auto-unban background loop: {e}",
                exc_info=True,
            )

    @auto_unban_check.before_loop
    async def before_unban_loop(self):
        await self.bot.wait_until_ready()


async def startup(bot: discord.Client) -> None:
    logger.info("[TEMPBAN] Initializing background unban worker...")

    loaded_features = 0
    for guild in bot.guilds:
        try:
            role_id = await get_tempban_role(guild.id)
            if role_id:
                loaded_features += 1
        except Exception as exc:
            logger.exception(
                f"[TEMPBAN] Failed loading configuration check for {guild.name}: {exc}"
            )

    try:
        setattr(bot, "tempban_handler", TempbanBackgroundHandler(bot))
        logger.info(
            f"[TEMPBAN] Background unban worker loop verified active across {loaded_features} server profiles."
        )
    except Exception as exc:
        logger.exception(
            f"[TEMPBAN] Fatal error spawning loop orchestrator instance: {exc}"
        )
