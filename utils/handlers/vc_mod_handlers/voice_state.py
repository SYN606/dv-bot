import discord

from utils.handlers.vc_mod_handlers.role_sync import (
    get_lock,
    sync_member_voice_roles,
)

VCChannel = discord.VoiceChannel | discord.StageChannel


# Handle VC updates
async def handle_voice_state_update(
    member: discord.Member,
    before: discord.VoiceState,
    after: discord.VoiceState,
) -> None:

    before_channel: VCChannel | None = before.channel
    after_channel: VCChannel | None = after.channel

    # Ignore non-channel updates
    if before_channel == after_channel:
        return

    lock = get_lock(
        member.id,
    )

    async with lock:
        await sync_member_voice_roles(
            member,
            after_channel,
        )
