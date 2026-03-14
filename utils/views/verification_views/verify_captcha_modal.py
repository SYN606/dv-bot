import secrets
import string
import discord

from sqlalchemy import select

from utils.embeds import make_embed
from db.engine import AsyncSessionLocal
from db.models import VerificationConfig


# ─────────────────────────────────────
# CAPTCHA GENERATOR
# ─────────────────────────────────────
def generate_token(length: int = 6) -> str:
    chars = string.ascii_lowercase + string.digits
    return "".join(secrets.choice(chars) for _ in range(length))


# ─────────────────────────────────────
# CAPTCHA MODAL
# ─────────────────────────────────────
class VerifyCaptchaModal(discord.ui.Modal):
    """
    Verification captcha modal.

    - Token based captcha
    - Replay protected
    - DB driven verification config
    - Safe interaction lifecycle
    """

    def __init__(self, guild_id: int):

        self.guild_id = guild_id
        self.token = generate_token()
        self._used = False

        super().__init__(
            title="Verification Check",
            timeout=120,
        )

        # Display captcha
        self.captcha_display = discord.ui.TextInput(
            label="Verification Code",
            default=self.token,
            required=False,
        )
        self.captcha_display.disabled = True

        # Input field
        self.code_input = discord.ui.TextInput(
            label="Enter the code shown above",
            placeholder="Type the code exactly",
            required=True,
            max_length=len(self.token),
        )

        self.add_item(self.captcha_display)
        self.add_item(self.code_input)

    # ─────────────────────────────────────
    # SUBMIT HANDLER
    # ─────────────────────────────────────
    async def on_submit(self, interaction: discord.Interaction):

        if self._used:
            return

        self._used = True

        try:
            await interaction.response.defer(ephemeral=True)
        except discord.NotFound:
            return

        guild = interaction.guild
        user = interaction.user

        if guild is None or not isinstance(user, discord.Member):
            return

        # ─────────────────────────
        # CAPTCHA VALIDATION
        # ─────────────────────────
        if self.code_input.value.strip().lower() != self.token:
            return await interaction.followup.send(
                embed=make_embed(
                    title="Verification Failed",
                    description="Incorrect code. Please try again.",
                    level="ERROR",
                ),
                ephemeral=True,
            )

        # ─────────────────────────
        # FETCH CONFIG
        # ─────────────────────────
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                select(VerificationConfig).where(
                    VerificationConfig.guild_id == guild.id
                )
            )

            config: VerificationConfig | None = result.scalar_one_or_none()

        if not config:
            return await interaction.followup.send(
                embed=make_embed(
                    title="Verification Error",
                    description="Verification system is not configured.",
                    level="ERROR",
                ),
                ephemeral=True,
            )

        verified_role = guild.get_role(config.verified_role_id)
        unverified_role = (
            guild.get_role(config.unverified_role_id)
            if config.unverified_role_id
            else None
        )

        if not verified_role:
            return await interaction.followup.send(
                embed=make_embed(
                    title="Verification Error",
                    description="Verified role no longer exists.",
                    level="ERROR",
                ),
                ephemeral=True,
            )

        # Already verified check
        if verified_role in user.roles:
            return await interaction.followup.send(
                embed=make_embed(
                    title="Already Verified",
                    description="You are already verified.",
                    level="INFO",
                ),
                ephemeral=True,
            )

        # ─────────────────────────
        # ROLE HIERARCHY CHECK
        # ─────────────────────────
        bot_member = guild.me

        if not bot_member or verified_role >= bot_member.top_role:
            return await interaction.followup.send(
                embed=make_embed(
                    title="Verification Error",
                    description="Bot cannot assign the verified role.",
                    level="ERROR",
                ),
                ephemeral=True,
            )

        # ─────────────────────────
        # APPLY VERIFICATION
        # ─────────────────────────
        try:
            await user.add_roles(
                verified_role,
                reason="User completed verification captcha",
            )

            if unverified_role and unverified_role in user.roles:
                await user.remove_roles(
                    unverified_role,
                    reason="User completed verification captcha",
                )

        except discord.HTTPException:
            return await interaction.followup.send(
                embed=make_embed(
                    title="Verification Error",
                    description="Failed to assign roles.",
                    level="ERROR",
                ),
                ephemeral=True,
            )

        # ─────────────────────────
        # SUCCESS MESSAGE
        # ─────────────────────────
        await interaction.followup.send(
            embed=make_embed(
                title="Verification Complete",
                description=f"You are now verified in **{guild.name}**.",
                level="SUCCESS",
            ),
            ephemeral=True,
        )

        # ─────────────────────────
        # LOG EVENT
        # ─────────────────────────
        if config.log_channel_id:
            log_channel = guild.get_channel(config.log_channel_id)

            if isinstance(log_channel, discord.TextChannel):
                try:
                    await log_channel.send(
                        embed=make_embed(
                            title="User Verified",
                            description=f"{user.mention} has been verified.",
                            level="INFO",
                        )
                    )
                except discord.HTTPException:
                    pass

    # ─────────────────────────────────────
    # TIMEOUT
    # ─────────────────────────────────────
    async def on_timeout(self):
        self._used = True
