import random
import string
import discord

from utils.embeds import make_embed
from utils.emojis import EMOJIS
from utils.handlers.verify_handler import handle_verification


# ─────────────────────────────────────
# CAPTCHA TOKEN GENERATOR
# ─────────────────────────────────────
def generate_token(length: int = 6) -> str:
    chars = string.ascii_uppercase + string.digits
    return "".join(random.choice(chars) for _ in range(length))


# ─────────────────────────────────────
# VERIFY CAPTCHA MODAL
# ─────────────────────────────────────
class VerifyCaptchaModal(discord.ui.Modal):
    """
    Wick-style verification captcha modal.

    • Captcha shown in modal title
    • User types code exactly
    • All verification logic happens here
    """

    def __init__(self, guild_id: int):
        self.guild_id = guild_id
        self.token = generate_token()

        super().__init__(
            title=f"Verification Required • Code: {self.token}",
            timeout=120,
        )

        self.code_input = discord.ui.TextInput(
            label="Verification Code",
            placeholder="Enter the code shown above",
            required=True,
            max_length=len(self.token),
        )

        self.add_item(self.code_input)

    async def on_submit(self, interaction: discord.Interaction):
        guild = interaction.guild
        if guild is None:
            return

        member = guild.get_member(interaction.user.id)
        if member is None:
            await interaction.response.send_message(
                embed=make_embed(
                    title="Verification Error",
                    description=
                    f"{EMOJIS['fail']} Unable to resolve your member instance.",
                    level="ERROR",
                ),
                ephemeral=True,
            )
            return

        # ─────────────────────────
        # CAPTCHA VALIDATION
        # ─────────────────────────
        user_input = self.code_input.value.strip().upper()

        if user_input != self.token:
            await interaction.response.send_message(
                embed=make_embed(
                    title="Verification Failed",
                    description=
                    (f"{EMOJIS['fail']} Incorrect verification code.\n\n"
                     f"{EMOJIS['arrow_point']} Click **Verify** and try again."
                     ),
                    level="ERROR",
                ),
                ephemeral=True,
            )
            return

        # ─────────────────────────
        # APPLY VERIFICATION
        # ─────────────────────────
        success = await handle_verification(
            guild=guild,
            member=member,
            interaction=interaction,
        )

        if not success:
            if not interaction.response.is_done():
                await interaction.response.send_message(
                    embed=make_embed(
                        title="Verification Error",
                        description=(
                            f"{EMOJIS['fail']} Something went wrong.\n"
                            f"{EMOJIS['arrow_point']} Please contact staff."),
                        level="ERROR",
                    ),
                    ephemeral=True,
                )

    async def on_timeout(self):
        # No interaction response allowed here
        # Optional: log timeout or metrics
        pass
