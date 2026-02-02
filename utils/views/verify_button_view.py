import discord

from utils.embeds import make_embed
from utils.emojis import EMOJIS

from db.db_helpers.verification import get_verification_config
from db.db_helpers.tempban import get_tempban_role

from utils.views.verify_captcha_modal import VerifyCaptchaModal


class VerifyButtonView(discord.ui.View):
    """
    Persistent verification button view.
    Opens a Wick-style captcha modal.
    """

    def __init__(self):
        super().__init__(timeout=None)

    @discord.ui.button(
        label="Verify",
        style=discord.ButtonStyle.success,
        emoji="✅",
        custom_id="verify:button",
    )
    async def verify(
        self,
        interaction: discord.Interaction,
        button: discord.ui.Button,
    ):
        guild = interaction.guild
        if guild is None:
            return

        member = guild.get_member(interaction.user.id)
        if member is None:
            return

        # ─────────────────────────
        # LOAD VERIFICATION CONFIG
        # ─────────────────────────
        config = get_verification_config(guild.id)
        if not config:
            return await interaction.response.send_message(
                embed=make_embed(
                    title="Verification Not Configured",
                    description=
                    (f"{EMOJIS['fail']} Verification is not set up for this server."
                     ),
                    level="ERROR",
                ),
                ephemeral=True,
            )

        # ─────────────────────────
        # ENFORCE VERIFY CHANNEL
        # ─────────────────────────
        if interaction.channel_id != config.verify_channel_id:
            return await interaction.response.send_message(
                embed=make_embed(
                    title="Wrong Channel",
                    description=
                    (f"{EMOJIS['warning']} Please verify in the correct channel.\n\n"
                     f"{EMOJIS['arrow_point']} Go to <#{config.verify_channel_id}>"
                     ),
                    level="WARNING",
                ),
                ephemeral=True,
            )

        # ─────────────────────────
        # TEMPBAN BLOCK
        # ─────────────────────────
        tempban_role_id = get_tempban_role(guild.id)
        if tempban_role_id:
            tempban_role = guild.get_role(tempban_role_id)
            if tempban_role and tempban_role in member.roles:
                return await interaction.response.send_message(
                    embed=make_embed(
                        title="Verification Blocked",
                        description=
                        (f"{EMOJIS['ban']} You are currently **tempbanned**.\n\n"
                         f"{EMOJIS['arrow_point']} You cannot verify while this is active.\n"
                         f"{EMOJIS['arrow_point']} Please contact staff or open a ticket."
                         ),
                        level="ERROR",
                    ),
                    ephemeral=True,
                )

        # ─────────────────────────
        # ALREADY VERIFIED
        # ─────────────────────────
        verified_role = guild.get_role(config.verified_role_id)
        if verified_role and verified_role in member.roles:
            return await interaction.response.send_message(
                embed=make_embed(
                    title="Already Verified",
                    description=(
                        f"{EMOJIS['success']} You are already verified."),
                    level="INFO",
                ),
                ephemeral=True,
            )

        # ─────────────────────────
        # OPEN CAPTCHA MODAL
        # ─────────────────────────
        await interaction.response.send_modal(
            VerifyCaptchaModal(guild_id=guild.id))
