import random
import string
import discord

from utils.embeds import make_embed
from utils.emojis import EMOJIS
from utils.handlers.verify_handler import handle_verification


# CAPTCHA TOKEN GENERATOR
def generate_token(length: int = 6) -> str:
    """
    Generate a readable captcha token.
    Uses lowercase letters + digits for clarity.
    """
    chars = string.ascii_lowercase + string.digits
    return "".join(random.choice(chars) for _ in range(length))


# VERIFY CAPTCHA MODAL
class VerifyCaptchaModal(discord.ui.Modal):
    """
    Wick-style verification captcha modal (v3).

    • Safe interaction handling (deferred)
    • No interaction expiry errors
    • Clean UX
    • Production ready
    """

    def __init__(self, guild_id: int):
        self.guild_id = guild_id
        self.token = generate_token()

        super().__init__(
            title="Verification Check",
            timeout=120,
        )

        # READ-ONLY CAPTCHA DISPLAY
        self.captcha_display = discord.ui.TextInput(
            label="Verification Code",
            default=self.token,
            required=False,
            style=discord.TextStyle.short,
        )
        self.captcha_display.disabled = True

        # USER INPUT FIELD
        self.code_input = discord.ui.TextInput(
            label="Enter the code shown above",
            placeholder="type the code exactly",
            required=True,
            max_length=len(self.token),
        )

        self.add_item(self.captcha_display)
        self.add_item(self.code_input)

    # SUBMIT HANDLER (FIXED)
    async def on_submit(self, interaction: discord.Interaction) -> None:
        """
        Handles captcha submission safely.
        Prevents 10062 Unknown Interaction errors.
        """

        # CRITICAL: Defer immediately to avoid expiry
        await interaction.response.defer(ephemeral=True)

        try:
            guild = interaction.guild
            if guild is None:
                return

            member = guild.get_member(interaction.user.id)
            if member is None:
                await interaction.followup.send(
                    embed=make_embed(
                        title="Verification Error",
                        description=
                        (f"{EMOJIS['fail']} We couldn’t verify your server membership.\n\n"
                         f"{EMOJIS['arrow_point']} Please contact a moderator."
                         ),
                        level="ERROR",
                    ),
                    ephemeral=True,
                )
                return

            # CAPTCHA VALIDATION
            user_input = self.code_input.value.strip().lower()

            if user_input != self.token:
                await interaction.followup.send(
                    embed=make_embed(
                        title="Verification Failed",
                        description=
                        (f"{EMOJIS['warning']} The code you entered is incorrect.\n\n"
                         f"{EMOJIS['arrow_point']} Click **Verify Account** and try again."
                         ),
                        level="ERROR",
                    ),
                    ephemeral=True,
                )
                return

            # APPLY VERIFICATION
            success = await handle_verification(
                guild=guild,
                member=member,
            )

            if success:
                await interaction.followup.send(
                    embed=make_embed(
                        title="Verification Complete",
                        description=(
                            f"{EMOJIS['success']} You are now verified!\n\n"
                            f"{EMOJIS['heart']} Welcome to **{guild.name}** 🎉"
                        ),
                        level="SUCCESS",
                    ),
                    ephemeral=True,
                )
            else:
                await interaction.followup.send(
                    embed=make_embed(
                        title="Verification Error",
                        description=
                        (f"{EMOJIS['fail']} We couldn’t complete verification right now.\n\n"
                         f"{EMOJIS['arrow_point']} Please contact a staff member."
                         ),
                        level="ERROR",
                    ),
                    ephemeral=True,
                )

        except Exception:
            # Failsafe — never let modal crash silently
            try:
                await interaction.followup.send(
                    embed=make_embed(
                        title="Verification Error",
                        description=
                        (f"{EMOJIS['fail']} An unexpected error occurred.\n\n"
                         f"{EMOJIS['arrow_point']} Please try again or contact staff."
                         ),
                        level="ERROR",
                    ),
                    ephemeral=True,
                )
            except Exception:
                pass  # Interaction may already be invalid

    async def on_timeout(self) -> None:
        # Intentionally silent (Wick-style behaviour)
        pass
