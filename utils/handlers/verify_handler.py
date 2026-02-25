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

    if not guild or not isinstance(member, discord.Member):
        print(f"{EMOJIS['fail']} [VERIFY] Invalid guild or member")
        return False

    bot_member = guild.me
    if bot_member is None:
        print(f"{EMOJIS['fail']} [VERIFY] Bot member not resolved")
        return False

    # ✅ Correct async call
    config = await get_verification_config(guild.id)

    if not config:
        print(f"{EMOJIS['warning']} [VERIFY] No verification config found")
        return False

    verified_role = guild.get_role(config.verified_role_id)
    unverified_role = (guild.get_role(config.unverified_role_id)
                       if config.unverified_role_id else None)

    if not verified_role:
        print(f"{EMOJIS['fail']} [VERIFY] Verified role not found")
        return False

    if verified_role >= bot_member.top_role:
        print(f"{EMOJIS['warning']} [VERIFY] Role hierarchy error")
        return False

    if unverified_role and unverified_role >= bot_member.top_role:
        unverified_role = None

    try:
        if unverified_role and unverified_role in member.roles:
            await member.remove_roles(
                unverified_role,
                reason="Verification completed",
            )

        if verified_role not in member.roles:
            await member.add_roles(
                verified_role,
                reason="User verified",
            )

    except discord.Forbidden:
        print(f"{EMOJIS['fail']} [VERIFY] Missing permissions")
        return False

    except discord.HTTPException as e:
        print(f"{EMOJIS['fail']} [VERIFY] API error: {e}")
        return False

    log_channel = guild.get_channel(config.log_channel_id)
    if isinstance(log_channel, discord.TextChannel):
        await log_channel.send(embed=make_embed(
            title="User Verified",
            description=
            (f"{EMOJIS['success']} {member.mention} has completed verification.\n\n"
             f"{EMOJIS['arrow_point']} **User ID:** `{member.id}`\n"
             f"{EMOJIS['arrow_point']} **Time:** "
             f"<t:{int(datetime.utcnow().timestamp())}:R>"),
            level="SUCCESS",
            footer=f"Verification • {guild.name}",
        ))

    print(f"{EMOJIS['success']} [VERIFY] Success for user {member.id}")
    return True
