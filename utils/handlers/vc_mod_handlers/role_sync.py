import discord

from db.db_helpers.vc_mod_helpers.vc_tracking import (
    get_role_from_channel,
)

from utils.handlers.vc_mod_handlers.vc_helpers import (
    sync_vc_role,
)

VCChannel = discord.VoiceChannel | discord.StageChannel


# Assign VC role
async def sync_join_role(
    member: discord.Member,
    channel: VCChannel,
) -> None:

    role_id = await get_role_from_channel(
        member.guild.id,
        channel.id,
    )

    if not role_id:
        return

    role = member.guild.get_role(role_id)

    if not role:
        return

    await sync_vc_role(
        member,
        role,
        assign=True,
    )


# Remove VC role
async def sync_leave_role(
    member: discord.Member,
    channel: VCChannel,
) -> None:

    role_id = await get_role_from_channel(
        member.guild.id,
        channel.id,
    )

    if not role_id:
        return

    role = member.guild.get_role(role_id)

    if not role:
        return

    await sync_vc_role(
        member,
        role,
        assign=False,
    )


# Switch VC roles
async def sync_switch_role(
    member: discord.Member,
    before: VCChannel,
    after: VCChannel,
) -> None:

    await sync_leave_role(
        member,
        before,
    )

    await sync_join_role(
        member,
        after,
    )
