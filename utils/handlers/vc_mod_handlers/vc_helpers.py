import discord


# Create VC role
async def create_vc_role(
    guild: discord.Guild,
    channel: discord.VoiceChannel,
) -> discord.Role:

    role_name = f"🎧 {channel.name}"

    existing = discord.utils.get(
        guild.roles,
        name=role_name,
    )

    if existing:
        return existing

    role = await guild.create_role(
        name=role_name,
        mentionable=False,
        hoist=False,
        reason=("VC Manager auto-created role"),
    )

    me = guild.me

    if me:
        try:
            await role.edit(
                position=(me.top_role.position - 1),
                reason=("VC role positioning"),
            )

        except Exception:
            pass

    return role


# Delete VC role
async def delete_vc_role(
    role: discord.Role,
) -> bool:

    try:
        await role.delete(
            reason=("VC Manager cleanup"),
        )
        return True

    except Exception:
        return False


# Sync VC role
async def sync_vc_role(
    member: discord.Member,
    role: discord.Role,
    *,
    assign: bool = True,
) -> bool:

    try:
        if assign:
            if role not in member.roles:
                await member.add_roles(
                    role,
                    reason=("VC Manager role sync"),
                )

        else:
            if role in member.roles:
                await member.remove_roles(
                    role,
                    reason=("VC Manager role sync"),
                )

        return True

    except Exception:
        return False
