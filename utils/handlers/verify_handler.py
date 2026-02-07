import asyncio
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
    """
    v2 Verification Handler

    Responsibilities:
    - Apply verification roles
    - Remove unverified role (if configured)
    - Log verification result
    - NO interaction / UI responses
    """

    # ─────────────────────────
    # Basic safety
    # ─────────────────────────
    if not guild or not isinstance(member, discord.Member):
        print(f"{EMOJIS['fail']} [VERIFY] Invalid guild or member")
        return False

    bot_member = guild.me
    if bot_member is None:
        print(
            f"{EMOJIS['fail']} [VERIFY] Bot member not resolved (guild.me is None)"
        )
        return False

    # ─────────────────────────
    # Load verification config
    # ─────────────────────────
    config = await asyncio.to_thread(
        get_verification_config,
        guild.id,
    )

    if not config:
        print(f"{EMOJIS['warning']} [VERIFY] No verification config found "
              f"for guild {guild.id}")
        return False

    verified_role = guild.get_role(config.verified_role_id)
    unverified_role = (guild.get_role(config.unverified_role_id)
                       if config.unverified_role_id else None)

    if not verified_role:
        print(f"{EMOJIS['fail']} [VERIFY] Verified role not found in guild")
        return False

    # ─────────────────────────
    # Role hierarchy safety
    # ─────────────────────────
    if verified_role >= bot_member.top_role:
        print(
            f"{EMOJIS['warning']} [VERIFY] Role hierarchy error\n"
            f"    Bot top role : {bot_member.top_role} ({bot_member.top_role.id})\n"
            f"    Verified role: {verified_role} ({verified_role.id})")
        return False

    if unverified_role and unverified_role >= bot_member.top_role:
        print(
            f"{EMOJIS['warning']} [VERIFY] Unverified role above bot role, ignoring\n"
            f"    Unverified role: {unverified_role}")
        unverified_role = None

    # ─────────────────────────
    # Apply roles
    # ─────────────────────────
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
        print(f"{EMOJIS['fail']} [VERIFY] Missing permissions to manage roles")
        return False

    except discord.HTTPException as e:
        print(
            f"{EMOJIS['fail']} [VERIFY] Discord API error while managing roles: {e}"
        )
        return False

    # ─────────────────────────
    # Log verification (server-side)
    # ─────────────────────────
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

    print(f"{EMOJIS['success']} [VERIFY] Verification successful "
          f"for user {member.id} in guild {guild.id}")

    return True
