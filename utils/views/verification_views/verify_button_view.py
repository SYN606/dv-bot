import discord

from utils.views.verification_views.verify_captcha_modal import VerifyCaptchaModal


class VerifyButtonView(discord.ui.View):
    """
    Persistent verification button view.

    - Publicly accessible
    - Safe interaction handling
    - Restart-safe (requires add_view in setup_hook)
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
            if not interaction.response.is_done():
                await interaction.response.send_message(
                    "This button can only be used inside a server.",
                    ephemeral=True,
                )
            return

        try:
            modal = VerifyCaptchaModal(guild_id=guild.id)

            if not interaction.response.is_done():
                await interaction.response.send_modal(modal)

        except discord.NotFound:
            # Interaction expired (user waited too long)
            pass

        except Exception:
            # Fallback protection
            try:
                if not interaction.response.is_done():
                    await interaction.response.send_message(
                        "Verification failed. Please click the button again.",
                        ephemeral=True,
                    )
            except Exception:
                pass
