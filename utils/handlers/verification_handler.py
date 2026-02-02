import discord
from datetime import datetime

from utils.embeds import make_embed
from utils.emojis import EMOJIS
from db.db_helpers.verification import get_verification_config


# ─────────────────────────────────────
# CORE VERIFY ACTION
# ─────────────────────────────────────
async def handle_verification(
    *,
    guild: discord.Guild,
    member: discord.Member,
    interaction: discord.Interaction | None = None,
) -> bool:
    """
    Applies verification roles and sends logs.

    This function assumes:
    - Captcha (if any) is already validated
    - Tempban checks are already done

    Returns True if verification succeeded.
    """

    # ─────────────────────────
    # BASIC SAFETY
    # ─────────────────────────
    if not guild or not isinstance(member, discord.Member):
        return False

    bot_member = guild.me
    if bot_member is None:
        return False

    # ─────────────────────────
    # LOAD CONFIG
    # ─────────────────────────
    config = get_verification_config(guild.id)
    if not config:
        return False

    verified_role = guild.get_role(config.verified_role_id)
    unverified_role = (guild.get_role(config.unverified_role_id)
                       if config.unverified_role_id else None)

    if not verified_role:
        return False

    # ─────────────────────────
    # ROLE SAFETY
    # ─────────────────────────
    if verified_role >= bot_member.top_role:
        return False

    if unverified_role and unverified_role >= bot_member.top_role:
        unverified_role = None  # silently ignore unsafe role

    # ─────────────────────────
    # APPLY ROLES
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
        return False

    # ─────────────────────────
    # LOG VERIFICATION
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

    # ─────────────────────────
    # OPTIONAL USER ACK
    # ─────────────────────────
    if interaction:
        try:
            await interaction.response.send_message(
                embed=make_embed(
                    title="Verification Complete",
                    description=
                    (f"{EMOJIS['success']} You have been successfully verified!\n\n"
                     f"{EMOJIS['arrow_point']} Welcome to **{guild.name}** 🎉"),
                    level="SUCCESS",
                ),
                ephemeral=True,
            )
        except discord.InteractionResponded:
            pass

    return True
