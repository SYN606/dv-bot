import discord
from utils.views.verify_captcha_modal import VerifyCaptchaModal


class VerifyButtonView(discord.ui.View):
    """
    Persistent verification button view.
    ONLY opens the captcha modal.
    ALL verification logic must live in the modal.
    """

    def __init__(self):
        super().__init__(timeout=None)  # REQUIRED for persistence

    @discord.ui.button(
        label="Verify",
        style=discord.ButtonStyle.success,
        emoji="✅",
        custom_id="verify:button",  # REQUIRED for persistent views
    )
    async def verify(
        self,
        interaction: discord.Interaction,
        button: discord.ui.Button,
    ):

        if interaction.guild is None:
            return

        await interaction.response.send_modal(
            VerifyCaptchaModal(guild_id=interaction.guild.id))
