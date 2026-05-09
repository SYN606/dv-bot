import discord


# Move all members
async def move_all_members(
    source: discord.VoiceChannel,
    target: discord.VoiceChannel,
    *,
    reason: str = "VC Manager moveall",
) -> int:

    moved = 0

    for member in source.members:
        try:
            await member.move_to(
                target,
                reason=reason,
            )

            moved += 1

        except Exception:
            continue

    return moved
