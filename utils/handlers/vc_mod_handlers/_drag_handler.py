from __future__ import annotations

from typing import TypeAlias
import discord
from ._moveall_handler import _safe_move_member

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

    return await _safe_move_member(member, target, reason)
