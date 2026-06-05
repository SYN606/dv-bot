import asyncio
from datetime import datetime
import discord
from sqlalchemy import select
from db.engine import AsyncSessionLocal
from db.models import VerificationConfig, TempbanRecord
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
            async with AsyncSessionLocal() as session:
                ban_check = await session.scalar(
                    select(TempbanRecord.user_id).where(
                        TempbanRecord.guild_id == guild.id).where(
                            TempbanRecord.user_id == member.id).where(
                                TempbanRecord.active == True))
            if ban_check is not None:
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
                        await log_channel.send(embed=make_embed(
                            title="User Verified",
                            description=
                            (f"{EMOJIS['success']} {member.mention} completed verification.\n\n"
                             f"{EMOJIS['arrow_point']} **User ID:** `{member.id}`\n"
                             f"{EMOJIS['arrow_point']} **Time:** <t:{int(datetime.utcnow().timestamp())}:R>"
                             ),
                            level="SUCCESS",
                            footer=f"Verification • {guild.name}"))
                    except (discord.Forbidden, discord.HTTPException):
                        pass

            return True

        finally:
            # Garbage collection for completed connection locks
            _VERIFICATION_LOCKS.pop(lock_key, None)
