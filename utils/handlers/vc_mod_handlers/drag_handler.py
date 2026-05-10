import discord


# Drag member
async def drag_member(
    member: discord.Member,
    target: discord.VoiceChannel,
    *,
    reason: str = "VC Manager drag",
) -> bool:

    try:
        await member.move_to(
            target,
            reason=reason,
        )
        return True

    except discord.Forbidden:
        return False

    except discord.HTTPException:
        return False
