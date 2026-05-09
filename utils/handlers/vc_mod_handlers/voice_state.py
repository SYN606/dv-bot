import discord

from utils.handlers.vc_mod_handlers.role_sync import (
    sync_join_role,
    sync_leave_role,
    sync_switch_role,
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

    # User joined VC
    if before_channel is None and after_channel is not None:
        await sync_join_role(
            member,
            after_channel,
        )

        return

    # User left VC
    if before_channel is not None and after_channel is None:
        await sync_leave_role(
            member,
            before_channel,
        )

        return

    # User switched VC
    if before_channel is not None and after_channel is not None:
        await sync_switch_role(
            member,
            before_channel,
            after_channel,
        )
