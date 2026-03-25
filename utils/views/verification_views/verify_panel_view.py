import discord
from discord.ui import View, Button, ChannelSelect, RoleSelect

from utils.core.embeds import make_embed
from utils.permissions.check_perms import is_bot_admin

from db.db_helpers.verification import (
    set_verification_config,
    get_verification_config,
    delete_verification_config,
)

from utils.views.verification_views.verify_button_view import VerifyButtonView


class VerificationView(View):
    def __init__(self, bot, guild: discord.Guild, actor: discord.Member):
        super().__init__(timeout=300)

        self.bot = bot
        self.guild = guild
        self.actor = actor
        self.message: discord.Message | None = None

        # setup state
        self.verify_channel_id = None
        self.log_channel_id = None
        self.verified_role_id = None
        self.unverified_role_id = None

        self.notice = None
        self._last_refresh = 0

        # start with panel buttons
        self.build_panel()

    # PANEL MODE
    def build_panel(self):
        self.clear_items()

        self.add_item(SetupButton())
        self.add_item(ResetButton())

    # =========================================================
    # SETUP MODE
    # =========================================================
    def build_setup(self):
        self.clear_items()

        self.add_item(VerifyChannelSelect(self))
        self.add_item(LogChannelSelect(self))
        self.add_item(VerifiedRoleSelect(self))
        self.add_item(UnverifiedRoleSelect(self))
        self.add_item(SaveButton())

    # =========================================================
    # SECURITY
    # =========================================================
    async def interaction_check(self, interaction: discord.Interaction):

        if interaction.user.id != self.actor.id:
            await interaction.response.send_message(
                "Not your panel.",
                ephemeral=True,
            )
            return False

        if not await is_bot_admin(interaction):
            return False

        return True

    # =========================================================
    # EMBEDS
    # =========================================================
    def panel_embed(self):
        return make_embed(
            title="🔐 Verification Panel",
            description="Choose an action below.",
            level="SYSTEM",
        )

    def setup_embed(self):

        def status(val, kind):
            if not val:
                return "❌ Not set"
            return f"✅ <#{val}>" if kind == "channel" else f"✅ <@&{val}>"

        embed = make_embed(
            title="Verification Setup",
            description="Configure and click save.",
            level="SYSTEM",
            footer=self.notice or "Waiting for input...",
        )

        embed.add_field(
            name="Verify Channel", value=status(self.verify_channel_id, "channel")
        )
        embed.add_field(
            name="Log Channel", value=status(self.log_channel_id, "channel")
        )
        embed.add_field(
            name="Verified Role", value=status(self.verified_role_id, "role")
        )
        embed.add_field(
            name="Unverified Role", value=status(self.unverified_role_id, "role")
        )

        return embed

    async def refresh(self, interaction, notice=None):

        if notice:
            self.notice = notice

        try:
            if not interaction.response.is_done():
                await interaction.response.edit_message(
                    embed=self.setup_embed(),
                    view=self,
                )
            else:
                await interaction.edit_original_response(
                    embed=self.setup_embed(),
                    view=self,
                )
        except discord.NotFound:
            pass


# =========================================================
# BUTTONS
# =========================================================
class SetupButton(Button):
    def __init__(self):
        super().__init__(label="Setup", style=discord.ButtonStyle.success)

    async def callback(self, interaction: discord.Interaction):
        view: VerificationView = self.view  # type: ignore

        view.build_setup()

        await interaction.response.edit_message(
            embed=view.setup_embed(),
            view=view,
        )


class ResetButton(Button):
    def __init__(self):
        super().__init__(label="Reset", style=discord.ButtonStyle.danger)

    async def callback(self, interaction: discord.Interaction):
        view: VerificationView = self.view  # type: ignore

        await interaction.response.send_modal(ResetModal(view.guild, view.actor))


# =========================================================
# SELECTORS
# =========================================================
class VerifyChannelSelect(ChannelSelect):
    def __init__(self, view):
        super().__init__(channel_types=[discord.ChannelType.text])
        self.view_ref = view

    async def callback(self, interaction):
        self.view_ref.verify_channel_id = self.values[0].id
        await self.view_ref.refresh(interaction, "Verify channel set")


class LogChannelSelect(ChannelSelect):
    def __init__(self, view):
        super().__init__(channel_types=[discord.ChannelType.text])
        self.view_ref = view

    async def callback(self, interaction):
        self.view_ref.log_channel_id = self.values[0].id
        await self.view_ref.refresh(interaction, "Log channel set")


class VerifiedRoleSelect(RoleSelect):
    def __init__(self, view):
        super().__init__()
        self.view_ref = view

    async def callback(self, interaction):
        self.view_ref.verified_role_id = self.values[0].id
        await self.view_ref.refresh(interaction, "Verified role set")


class UnverifiedRoleSelect(RoleSelect):
    def __init__(self, view):
        super().__init__(min_values=0, max_values=1)
        self.view_ref = view

    async def callback(self, interaction):
        self.view_ref.unverified_role_id = self.values[0].id if self.values else None
        await self.view_ref.refresh(interaction, "Unverified role updated")


# =========================================================
# SAVE
# =========================================================
class SaveButton(Button):
    def __init__(self):
        super().__init__(label="Save", style=discord.ButtonStyle.success)

    async def callback(self, interaction):
        view: VerificationView = self.view  # type: ignore
        guild = interaction.guild

        if not all(
            [
                view.verify_channel_id,
                view.log_channel_id,
                view.verified_role_id,
            ]
        ):
            return await view.refresh(interaction, "Fill all fields")

        await interaction.response.defer()

        await set_verification_config(
            guild_id=guild.id, # type: ignore
            verify_channel_id=view.verify_channel_id, # type: ignore
            log_channel_id=view.log_channel_id, # type: ignore
            verified_role_id=view.verified_role_id, # type: ignore
            unverified_role_id=view.unverified_role_id,
        )

        channel = guild.get_channel(view.verify_channel_id) # type: ignore

        if isinstance(channel, discord.TextChannel):
            await channel.send(
                embed=make_embed(
                    title="Verification",
                    description=(
                            "Verification is required to access the server.\n"
                            "Click the button below to begin."
                        ),
                    level="SYSTEM",
                ),
                view=VerifyButtonView(),
            )

        await interaction.edit_original_response(
            embed=make_embed(
                title="Done",
                description="Verification enabled",
                level="SUCCESS",
            ),
            view=None,
        )


# =========================================================
# MODAL
# =========================================================
class ResetModal(discord.ui.Modal, title="Confirm Reset"):
    confirm = discord.ui.TextInput(label="Type YES")

    def __init__(self, guild, actor):
        super().__init__()
        self.guild = guild
        self.actor = actor

    async def on_submit(self, interaction):

        if self.confirm.value != "YES":
            return await interaction.response.send_message("Cancelled", ephemeral=True)

        config = await get_verification_config(self.guild.id)

        if config:
            await delete_verification_config(self.guild.id)

        await interaction.response.send_message("Verification reset", ephemeral=True)
