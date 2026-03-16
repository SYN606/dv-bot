import discord
import asyncio
from datetime import datetime

from utils.core.embeds import make_embed
from utils.core.emojis import EMOJIS
from db.db_helpers.verification import get_verification_config


async def handle_verification(
    *,
    guild: discord.Guild,
    member: discord.Member,
) -> bool:

    if guild is None or not isinstance(member, discord.Member):
        return False

    bot_member = guild.me
    if bot_member is None:
        return False

    config = await get_verification_config(guild.id)
    if not config:
        return False

    verified_role = guild.get_role(config.verified_role_id)
    unverified_role = (
        guild.get_role(config.unverified_role_id) if config.unverified_role_id else None
    )

    if not verified_role:
        return False

    # Already verified (fast exit)
    if verified_role in member.roles:
        return True

    # Hierarchy validation
    if verified_role >= bot_member.top_role:
        return False

    if unverified_role and unverified_role >= bot_member.top_role:
        unverified_role = None

    # ROLE UPDATE
    try:
        new_roles = [r for r in member.roles if r != unverified_role]

        if verified_role not in new_roles:
            new_roles.append(verified_role)

        await member.edit(
            roles=new_roles,
            reason="User verified",
        )

    except discord.Forbidden, discord.HTTPException:
        return False

    # LOGGING
    log_channel = guild.get_channel(config.log_channel_id)

    if isinstance(log_channel, discord.TextChannel):
        try:
            await asyncio.sleep(0.2)

            await log_channel.send(
                embed=make_embed(
                    title="User Verified",
                    description=(
                        f"{EMOJIS['success']} {member.mention} completed verification.\n\n"
                        f"{EMOJIS['arrow_point']} **User ID:** `{member.id}`\n"
                        f"{EMOJIS['arrow_point']} **Time:** "
                        f"<t:{int(datetime.utcnow().timestamp())}:R>"
                    ),
                    level="SUCCESS",
                    footer=f"Verification • {guild.name}",
                )
            )

        except discord.Forbidden, discord.HTTPException:
            pass

    return True
