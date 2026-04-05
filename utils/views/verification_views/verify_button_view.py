import asyncio
import discord

from utils.core.emojis import EMOJIS
from utils.views.verification_views.verify_captcha_modal import VerifyCaptchaModal
from db.db_helpers.verification import get_verification_config

# ─────────────────────────────────────
# COOLDOWN STORE
# ─────────────────────────────────────
_verify_cooldown: dict[int, float] = {}
VERIFY_COOLDOWN = 5  # seconds


# ─────────────────────────────────────
# VERIFY BUTTON VIEW
# ─────────────────────────────────────
class VerifyButtonView(discord.ui.View):
    """
    Persistent verification button view.

    Features:
    - Persistent (restart-safe)
    - Per-user cooldown protection
    - Prevents verified users reopening captcha
    - Interaction lifecycle safe
    - Rate-limit safe
    """

    def __init__(self):
        super().__init__(timeout=None)

    @discord.ui.button(
        label="Verify Account",
        style=discord.ButtonStyle.success,
        emoji=EMOJIS["okay"],
        custom_id="verify:button",
    )
    async def verify(
        self,
        interaction: discord.Interaction,
        _: discord.ui.Button,
    ) -> None:

        user = interaction.user
        guild = interaction.guild

        # ─────────────────────────
        # VALIDATE CONTEXT
        # ─────────────────────────
        if guild is None or not isinstance(user, discord.Member):
            if not interaction.response.is_done():
                try:
                    await interaction.response.send_message(
                        "This button can only be used inside a server.",
                        ephemeral=True,
                    )
                except discord.HTTPException:
                    pass
            return

        # ─────────────────────────
        # SPAM COOLDOWN
        # ─────────────────────────
        now = asyncio.get_running_loop().time()
        last = _verify_cooldown.get(user.id, 0)

        if now - last < VERIFY_COOLDOWN:
            if not interaction.response.is_done():
                try:
                    await interaction.response.send_message(
                        "Please wait a moment before trying again.",
                        ephemeral=True,
                    )
                except discord.HTTPException:
                    pass
            return

        _verify_cooldown[user.id] = now

        # ─────────────────────────
        # FETCH CONFIG
        # ─────────────────────────
        try:
            config = await get_verification_config(guild.id)
        except Exception:
            config = None

        if not config:
            if not interaction.response.is_done():
                try:
                    await interaction.response.send_message(
                        "Verification system is not configured.",
                        ephemeral=True,
                    )
                except discord.HTTPException:
                    pass
            return

        verified_role = guild.get_role(config.verified_role_id)

        if not verified_role:
            if not interaction.response.is_done():
                try:
                    await interaction.response.send_message(
                        "Verification role no longer exists.",
                        ephemeral=True,
                    )
                except discord.HTTPException:
                    pass
            return

        # ─────────────────────────
        # ALREADY VERIFIED CHECK
        # ─────────────────────────
        if verified_role in user.roles:
            if not interaction.response.is_done():
                try:
                    await interaction.response.send_message(
                        "You are already verified.",
                        ephemeral=True,
                    )
                except discord.HTTPException:
                    pass
            return

        # ─────────────────────────
        # OPEN CAPTCHA MODAL
        # ─────────────────────────
        try:
            modal = VerifyCaptchaModal(guild_id=guild.id)

            if not interaction.response.is_done():
                await interaction.response.send_modal(modal)

        except discord.NotFound:
            return  # interaction expired

        except discord.HTTPException:
            if not interaction.response.is_done():
                try:
                    await interaction.response.send_message(
                        "Verification temporarily unavailable. Please try again.",
                        ephemeral=True,
                    )
                except discord.HTTPException:
                    pass

        except Exception:
            if not interaction.response.is_done():
                try:
                    await interaction.response.send_message(
                        "Something went wrong starting verification.",
                        ephemeral=True,
                    )
                except discord.HTTPException:
                    pass
