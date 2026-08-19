from __future__ import annotations

import discord
from db.db_helpers.vc_role import get_vc_role_id


async def handle_voice_state_update(member: discord.Member,
                                    before: discord.VoiceState,
                                    after: discord.VoiceState) -> None:
    """Auto-loaded event handler for tracking voice channel joins and leaves,

    granting or revoking configured VC roles dynamically.
    """
    if member.bot:
        return

    if before.channel == after.channel:
        return

    guild = member.guild

    role_id = await get_vc_role_id(guild.id)
    if not role_id:
        return

    vc_role = guild.get_role(role_id)
    if not vc_role:
        return

    bot_member = guild.me

    if not bot_member.guild_permissions.manage_roles:
        return

    if vc_role.position >= bot_member.top_role.position:
        return

    try:
        # JOIN EVENT: User connected to a voice channel
        if before.channel is None and after.channel is not None:
            if vc_role not in member.roles:
                await member.add_roles(vc_role, reason="Joined Voice Channel")

        # LEAVE EVENT: User disconnected from a voice channel
        elif before.channel is not None and after.channel is None:
            if vc_role in member.roles:
                await member.remove_roles(vc_role, reason="Left Voice Channel")

    except (discord.Forbidden, discord.HTTPException):
        pass
