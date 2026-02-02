import discord
from discord.ui import View, Button, ChannelSelect, RoleSelect

from utils.embeds import make_embed
from utils.emojis import EMOJIS
from utils.check_perms import is_bot_admin
from db.db_helpers.verification import set_verification_config
from utils.views.verify_button_view import VerifyButtonView


class VerifySetupView(View):
    """
    Admin-only interactive verification setup panel.
    Uses native Discord selectors (Wick-style).
    """

    def __init__(self, guild: discord.Guild):
        super().__init__(timeout=300)
        self.guild = guild

        # Selected values
        self.verify_channel_id: int | None = None
        self.log_channel_id: int | None = None
        self.verified_role_id: int | None = None
        self.unverified_role_id: int | None = None

        # UI components
        self.add_item(VerifyChannelSelect(self))
        self.add_item(LogChannelSelect(self))
        self.add_item(VerifiedRoleSelect(self))
        self.add_item(UnverifiedRoleSelect(self))
        self.add_item(VerifySetupSaveButton())


# ─────────────────────────────────────
# CHANNEL SELECTORS
# ─────────────────────────────────────
class VerifyChannelSelect(ChannelSelect):

    def __init__(self, view: VerifySetupView):
        super().__init__(
            placeholder="Select verification channel",
            channel_types=[discord.ChannelType.text],
            min_values=1,
            max_values=1,
        )
        self.view_ref = view

    async def callback(self, interaction: discord.Interaction):
        self.view_ref.verify_channel_id = self.values[0].id
        await interaction.response.send_message(
            f"{EMOJIS['success']} Verification channel selected.",
            ephemeral=True,
        )


class LogChannelSelect(ChannelSelect):

    def __init__(self, view: VerifySetupView):
        super().__init__(
            placeholder="Select verification log channel",
            channel_types=[discord.ChannelType.text],
            min_values=1,
            max_values=1,
        )
        self.view_ref = view

    async def callback(self, interaction: discord.Interaction):
        self.view_ref.log_channel_id = self.values[0].id
        await interaction.response.send_message(
            f"{EMOJIS['success']} Log channel selected.",
            ephemeral=True,
        )


# ─────────────────────────────────────
# ROLE SELECTORS
# ─────────────────────────────────────
class VerifiedRoleSelect(RoleSelect):

    def __init__(self, view: VerifySetupView):
        super().__init__(
            placeholder="Select verified role",
            min_values=1,
            max_values=1,
        )
        self.view_ref = view

    async def callback(self, interaction: discord.Interaction):
        self.view_ref.verified_role_id = self.values[0].id
        await interaction.response.send_message(
            f"{EMOJIS['success']} Verified role selected.",
            ephemeral=True,
        )


class UnverifiedRoleSelect(RoleSelect):

    def __init__(self, view: VerifySetupView):
        super().__init__(
            placeholder="Select unverified role (optional)",
            min_values=0,
            max_values=1,
        )
        self.view_ref = view

    async def callback(self, interaction: discord.Interaction):
        if self.values:
            self.view_ref.unverified_role_id = self.values[0].id
            msg = "Unverified role selected."
        else:
            self.view_ref.unverified_role_id = None
            msg = "Unverified role cleared."

        await interaction.response.send_message(
            f"{EMOJIS['success']} {msg}",
            ephemeral=True,
        )


# ─────────────────────────────────────
# SAVE CONFIGURATION BUTTON
# ─────────────────────────────────────
class VerifySetupSaveButton(Button):

    def __init__(self):
        super().__init__(
            label="Save & Post Verify Message",
            style=discord.ButtonStyle.success,
            emoji="💾",
        )

    async def callback(self, interaction: discord.Interaction):
        view: VerifySetupView = self.view  # type: ignore
        guild = interaction.guild

        if guild is None:
            return

        # ─────────────────────────
        # PERMISSION CHECK
        # ─────────────────────────
        if not is_bot_admin(interaction):
            return await interaction.response.send_message(
                embed=make_embed(
                    title="Permission Denied",
                    description=
                    "You are not allowed to configure verification.",
                    level="ERROR",
                ),
                ephemeral=True,
            )

        # ─────────────────────────
        # REQUIRED FIELDS CHECK
        # ─────────────────────────
        if not all([
                view.verify_channel_id,
                view.log_channel_id,
                view.verified_role_id,
        ]):
            return await interaction.response.send_message(
                f"{EMOJIS['warning']} Please select all required options before saving.",
                ephemeral=True,
            )

        # ─────────────────────────
        # SAVE TO DATABASE
        # ─────────────────────────
        set_verification_config(
            guild_id=guild.id,
            verify_channel_id=view.verify_channel_id,
            log_channel_id=view.log_channel_id,
            verified_role_id=view.verified_role_id,
            unverified_role_id=view.unverified_role_id,
        )

        # ─────────────────────────
        # POST VERIFY MESSAGE
        # ─────────────────────────
        verify_channel = guild.get_channel(view.verify_channel_id)

        if isinstance(verify_channel, discord.TextChannel):
            await verify_channel.send(
                embed=make_embed(
                    title="Server Verification",
                    description=
                    (f"{EMOJIS['announcement']} Click the button below to verify.\n\n"
                     f"{EMOJIS['arrow_point']} Verification is required to access the server."
                     ),
                    level="SYSTEM",
                ),
                view=VerifyButtonView(),
            )

        # ─────────────────────────
        # DISABLE UI
        # ─────────────────────────
        for item in view.children:
            item.disabled = True  # type: ignore

        await interaction.response.edit_message(
            embed=make_embed(
                title="Verification Configured",
                description=
                (f"{EMOJIS['success']} Verification system is now active.\n\n"
                 f"{EMOJIS['arrow_point']} Verify message posted\n"
                 f"{EMOJIS['arrow_point']} Roles & logging enabled"),
                level="SUCCESS",
            ),
            view=view,
        )

        view.stop()
