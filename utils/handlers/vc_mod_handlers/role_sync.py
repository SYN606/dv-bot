import asyncio
import discord

from utils.handlers.vc_mod_handlers.cache_handler import (
    VC_ROLE_CACHE,
)

from utils.handlers.vc_mod_handlers.vc_helpers import (
    sync_vc_role,
)

VCChannel = discord.VoiceChannel | discord.StageChannel

VOICE_LOCKS: dict[
    int,
    asyncio.Lock,
] = {}


# GET MEMBER LOCK
def get_lock(
    member_id: int,
) -> asyncio.Lock:

    return VOICE_LOCKS.setdefault(
        member_id,
        asyncio.Lock(),
    )


# CENTRALIZED VC ROLE SYNC
async def sync_member_voice_roles(
    member: discord.Member,
    channel: VCChannel | None,
) -> None:

    guild_cache = VC_ROLE_CACHE.get(
        member.guild.id,
        {},
    )

    if not guild_cache:
        return

    managed_role_ids = {
        data["role_id"] for data in guild_cache.values() if data["managed_role"]
    }

    # Remove old VC roles
    for role in member.roles:
        if role.id not in managed_role_ids:
            continue

        await sync_vc_role(
            member,
            role,
            assign=False,
        )

    # User disconnected
    if channel is None:
        return

    data = guild_cache.get(
        channel.id,
    )

    if not data:
        return

    if not data["enabled"]:
        return

    if not data["auto_role"]:
        return

    role = member.guild.get_role(
        data["role_id"],
    )

    if not role:
        return

    await sync_vc_role(
        member,
        role,
        assign=True,
    )
