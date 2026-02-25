import discord

from utils.views.verification_views.verify_captcha_modal import VerifyCaptchaModal


class VerifyButtonView(discord.ui.View):
    """
    Persistent verification button view.

    - Publicly accessible (no admin checks)
    - Safe interaction handling
    - Production ready
    """

    def __init__(self):
        super().__init__(timeout=None)

    @discord.ui.button(
        label="Verify Account",
        style=discord.ButtonStyle.success,
        emoji="✅",
        custom_id="verify:button",
    )
    async def verify(
        self,
        interaction: discord.Interaction,
        button: discord.ui.Button,
    ) -> None:

        guild = interaction.guild
        if guild is None:
            # Should never happen, but safe guard
            return await interaction.response.send_message(
                "This button can only be used inside a server.",
                ephemeral=True,
            )

        try:
            await interaction.response.send_modal(
                VerifyCaptchaModal(guild_id=guild.id))
        except Exception:
            # Safety fallback (rare interaction edge case)
            if not interaction.response.is_done():
                await interaction.response.send_message(
                    "Something went wrong. Please try again.",
                    ephemeral=True,
                )
