import discord

from utils.views.verification_views.verify_captcha_modal import VerifyCaptchaModal


class VerifyButtonView(discord.ui.View):
    """
    v2 Verification Button View

    - Persistent (required for verification systems)
    - Clean, minimal UI
    - Opens captcha modal only
    - No verification logic here (by design)
    """

    def __init__(self):
        super().__init__(timeout=None)  # REQUIRED for persistent views

    @discord.ui.button(
        label="Verify Account",
        style=discord.ButtonStyle.success,
        emoji="✅",
        custom_id="verify:button",  # REQUIRED for persistence
    )
    async def verify(
        self,
        interaction: discord.Interaction,
        button: discord.ui.Button,
    ) -> None:
        """
        Opens the verification captcha modal.
        """

        # UX polish: disable button immediately to avoid spam-click feel
        button.disabled = True

        try:
            await interaction.response.send_modal(
                VerifyCaptchaModal(
                    guild_id=interaction.guild.id  # type: ignore
                ))
        finally:
            # Re-enable button if modal fails to open
            button.disabled = False
