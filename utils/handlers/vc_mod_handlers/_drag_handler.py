from __future__ import annotations

from typing import TypeAlias
import discord

# Explicit type union for voice-capable channels
VCTarget: TypeAlias = discord.VoiceChannel | discord.StageChannel


async def drag_member(
    member: discord.Member,
    target: VCTarget,
    *,
    reason: str = "VC Manager drag",
) -> bool:
    """Move a single member to a target Voice or Stage channel."""
    if not member.voice or not member.voice.channel:
        return False

    try:
        await member.move_to(target, reason=reason)
        return True
    except (discord.Forbidden, discord.HTTPException):
        return False
