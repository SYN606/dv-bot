import discord


# Create VC role
async def create_vc_role(guild: discord.Guild,
                         channel: discord.VoiceChannel) -> discord.Role:
    role_name = f"🎧 {channel.name}"
    existing = discord.utils.get(guild.roles, name=role_name)

    me = guild.me
    # Reuse existing role
    if existing:
        if me:
            try:
                if existing.position >= me.top_role.position:
                    target_position = max(1, me.top_role.position - 1)

                    await existing.edit(position=target_position,
                                        reason="VC role hierarchy fix")
            except (discord.Forbidden, discord.HTTPException):
                pass
        return existing

    # Create new role
    role = await guild.create_role(name=role_name,
                                   mentionable=False,
                                   hoist=False,
                                   reason="VC Manager auto-created role")
    # Position role safely
    if me:
        try:
            target_position = max(1, me.top_role.position - 1)
            await role.edit(position=target_position,
                            reason="VC role positioning")
        except (discord.Forbidden, discord.HTTPException):
            pass
    return role


# Delete VC role
async def delete_vc_role(role: discord.Role, ) -> bool:
    try:
        await role.delete(reason="VC Manager cleanup")
        return True
    except (discord.Forbidden, discord.HTTPException):
        return False


# Sync VC role
async def sync_vc_role(member: discord.Member,
                       role: discord.Role,
                       *,
                       assign: bool = True) -> bool:
    me = member.guild.me
    if not me:
        return False
    # Hierarchy check
    if role >= me.top_role:
        return False
    try:
        # Assign role
        if assign:
            if role not in member.roles:
                await member.add_roles(role, reason="VC Manager role sync")
        # Remove role
        else:
            if role in member.roles:
                await member.remove_roles(role, reason="VC Manager role sync")
        return True
    except (discord.Forbidden, discord.HTTPException):
        return False
