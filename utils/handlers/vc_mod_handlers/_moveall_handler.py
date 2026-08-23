from __future__ import annotations

import asyncio
from typing import TypeAlias
import discord

# Explicit type union for voice-capable channels
VCTarget: TypeAlias = discord.VoiceChannel | discord.StageChannel

# Global semaphore to limit concurrent HTTP API requests to Discord
_MOVE_SEMAPHORE = asyncio.Semaphore(3)


async def _safe_move_member(member: discord.Member, target: VCTarget,
                            reason: str) -> bool:
    """Move an individual member with rate-limit handling and exponential backoff."""
    async with _MOVE_SEMAPHORE:
        try:
            await member.move_to(target, reason=reason)
            return True
        except discord.HTTPException as e:
            if e.status == 429:  # Rate limited
                retry_after = getattr(e, "retry_after", 1.5)
                await asyncio.sleep(retry_after)
                try:
                    await member.move_to(target, reason=reason)
                    return True
                except discord.HTTPException:
                    return False
            return False
        except (discord.Forbidden, Exception):
            return False


async def move_all_members(source: VCTarget,
                           target: VCTarget,
                           *,
                           reason: str = "VC Manager moveall") -> int:
    """Move all members from the source channel to the target channel in safe batches."""
    members_to_move = list(source.members)
    if not members_to_move:
        return 0

    moved_count = 0
    batch_size = 5

    # Process members in small chunks to keep Gateway payloads steady
    for i in range(0, len(members_to_move), batch_size):
        batch = members_to_move[i:i + batch_size]
        tasks = [_safe_move_member(member, target, reason) for member in batch]
        results = await asyncio.gather(*tasks)

        moved_count += sum(1 for success in results if success)

        # Brief delay between batches to respect rate-limit buckets
        await asyncio.sleep(0.35)

    return moved_count
