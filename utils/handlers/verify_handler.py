import discord
from datetime import datetime

from utils.embeds import make_embed
from utils.emojis import EMOJIS
from db.db_helpers.verification import get_verification_config


async def handle_verification(
    *,
    guild: discord.Guild,
    member: discord.Member,
) -> bool:

    if guild is None or not isinstance(member, discord.Member):
        return False

    bot_member = guild.me
    if bot_member is None:
        return False

    config = await get_verification_config(guild.id)
    if not config:
        return False

    verified_role = guild.get_role(config.verified_role_id)
    unverified_role = (guild.get_role(config.unverified_role_id)
                       if config.unverified_role_id else None)

    if not verified_role:
        return False

    # Hierarchy validation
    if verified_role >= bot_member.top_role:
        return False

    if unverified_role and unverified_role >= bot_member.top_role:
        unverified_role = None

    # Idempotency check
    if verified_role in member.roles:
        return True  # already verified

    # Apply roles safely
    try:
        role_changes = []

        if unverified_role and unverified_role in member.roles:
            role_changes.append(("remove", unverified_role))

        role_changes.append(("add", verified_role))

        for action, role in role_changes:
            if action == "remove":
                await member.remove_roles(
                    role,
                    reason="Verification completed",
                )
            else:
                await member.add_roles(
                    role,
                    reason="User verified",
                )

    except (discord.Forbidden, discord.HTTPException):
        return False

    # Logging (safe)
    log_channel = guild.get_channel(config.log_channel_id)

    if isinstance(log_channel, discord.TextChannel):
        try:
            await log_channel.send(embed=make_embed(
                title="User Verified",
                description=
                (f"{EMOJIS['success']} {member.mention} completed verification.\n\n"
                 f"{EMOJIS['arrow_point']} **User ID:** `{member.id}`\n"
                 f"{EMOJIS['arrow_point']} **Time:** "
                 f"<t:{int(datetime.utcnow().timestamp())}:R>"),
                level="SUCCESS",
                footer=f"Verification • {guild.name}",
            ))
        except (discord.Forbidden, discord.HTTPException):
            pass

    return True
