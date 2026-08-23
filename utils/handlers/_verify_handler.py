import asyncio
from datetime import datetime, timezone
import discord

from db.models import TempbanRecord
from db.db_helpers.verification import get_verification_config
from utils.core.embeds import make_embed
from utils.core.emojis import EMOJIS

_VERIFICATION_LOCKS: dict[tuple[int, int], asyncio.Lock] = {}


async def handle_verification(*, guild: discord.Guild,
                              member: discord.Member) -> bool:
    if not guild or not isinstance(member, discord.Member) or member.bot:
        return False

    bot_member = guild.me
    if not bot_member:
        return False

    lock_key = (guild.id, member.id)
    lock = _VERIFICATION_LOCKS.setdefault(lock_key, asyncio.Lock())

    async with lock:
        try:
            # Tortoise ORM query: Check if user has an active tempban
            has_active_ban = await TempbanRecord.filter(guild_id=guild.id,
                                                        user_id=member.id,
                                                        active=True).exists()

            if has_active_ban:
                return False

            config = await get_verification_config(guild.id)
            if not config or not config.verified_role_id:
                return False

            verified_role = guild.get_role(config.verified_role_id)
            if not verified_role:
                return False

            if verified_role in member.roles:
                return True

            unverified_role = None
            if config.unverified_role_id:
                unverified_role = guild.get_role(config.unverified_role_id)

            # Hierarchy validation
            if verified_role >= bot_member.top_role:
                return False

            if unverified_role and unverified_role >= bot_member.top_role:
                unverified_role = None

            # Permission validation
            if not bot_member.guild_permissions.manage_roles:
                return False

            # Role update handling
            try:
                new_roles = [
                    role for role in member.roles if role != unverified_role
                ]
                if verified_role not in new_roles:
                    new_roles.append(verified_role)
                await member.edit(roles=new_roles, reason="User verified")
            except (discord.Forbidden, discord.HTTPException):
                return False

            # Logging execution
            if config.log_channel_id:
                log_channel = guild.get_channel(config.log_channel_id)
                if isinstance(log_channel, discord.TextChannel):
                    await asyncio.sleep(0.2)
                    try:
                        timestamp = int(datetime.now(timezone.utc).timestamp())
                        await log_channel.send(embed=make_embed(
                            title="User Verified",
                            description=
                            (f"{EMOJIS.get('success', '✅')} {member.mention} completed verification.\n\n"
                             f"{EMOJIS.get('arrow_point', '➡️')} **User ID:** `{member.id}`\n"
                             f"{EMOJIS.get('arrow_point', '➡️')} **Time:** <t:{timestamp}:R>"
                             ),
                            level="SUCCESS",
                            footer=f"Verification • {guild.name}"))
                    except (discord.Forbidden, discord.HTTPException):
                        pass

            return True

        finally:
            # Garbage collection for completed connection locks
            _VERIFICATION_LOCKS.pop(lock_key, None)
