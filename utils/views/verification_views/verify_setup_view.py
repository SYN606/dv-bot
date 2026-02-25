import discord
from discord.ui import View, Button, ChannelSelect, RoleSelect

from utils.embeds import make_embed
from utils.check_perms import is_bot_admin
from db.db_helpers.verification import set_verification_config
from utils.views.verification_views.verify_button_view import VerifyButtonView


class VerifySetupView(View):
    """
    v4 Verification Setup View

    - Fully async-safe
    - Proper permission awaiting
    - Role hierarchy validation
    - Production ready
    """

    def __init__(self, guild: discord.Guild):
        super().__init__(timeout=300)

        self.guild = guild
        self.message: discord.Message | None = None

        self.verify_channel_id: int | None = None
        self.log_channel_id: int | None = None
        self.verified_role_id: int | None = None
        self.unverified_role_id: int | None = None

        self.notice: str | None = None

        self.add_item(VerifyChannelSelect(self))
        self.add_item(LogChannelSelect(self))
        self.add_item(VerifiedRoleSelect(self))
        self.add_item(UnverifiedRoleSelect(self))
        self.add_item(VerifySetupSaveButton())

    # ─────────────────────────────────────
    # EMBED BUILDER
    # ─────────────────────────────────────
    def build_embed(self) -> discord.Embed:

        def fmt(value: int | None, kind: str) -> str:
            if not value:
                return "Not selected"
            if kind == "channel":
                return f"<#{value}>"
            if kind == "role":
                return f"<@&{value}>"
            return "Unknown"

        return make_embed(
            title="Verification Setup",
            description=
            ("Configure the server verification system.\n\n"
             f"Verification channel: {fmt(self.verify_channel_id, 'channel')}\n"
             f"Log channel: {fmt(self.log_channel_id, 'channel')}\n"
             f"Verified role: {fmt(self.verified_role_id, 'role')}\n"
             f"Unverified role: {fmt(self.unverified_role_id, 'role')}"),
            level="SYSTEM",
            footer=self.notice or "Select options and click Save to apply",
        )

    async def refresh(
        self,
        interaction: discord.Interaction,
        notice: str | None = None,
    ):
        if notice:
            self.notice = notice

        await interaction.response.edit_message(
            embed=self.build_embed(),
            view=self,
        )

    # ─────────────────────────────────────
    # TIMEOUT HANDLING
    # ─────────────────────────────────────
    async def on_timeout(self):
        for item in self.children:
            item.disabled = True  # type: ignore

        if self.message:
            try:
                await self.message.edit(
                    content="Verification setup timed out.",
                    view=self,
                )
            except Exception:
                pass


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
        await self.view_ref.refresh(
            interaction,
            "Verification channel selected",
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
        await self.view_ref.refresh(
            interaction,
            "Log channel selected",
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
        await self.view_ref.refresh(
            interaction,
            "Verified role selected",
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
        self.view_ref.unverified_role_id = (self.values[0].id
                                            if self.values else None)
        await self.view_ref.refresh(
            interaction,
            "Unverified role updated",
        )


# ─────────────────────────────────────
# SAVE BUTTON
# ─────────────────────────────────────
class VerifySetupSaveButton(Button):

    def __init__(self):
        super().__init__(
            label="Save & Post Verification Message",
            style=discord.ButtonStyle.success,
        )

    async def callback(self, interaction: discord.Interaction):

        view: VerifySetupView = self.view  # type: ignore
        guild = interaction.guild

        if guild is None:
            return

        # 🔥 FIXED: properly awaited permission check
        if not await is_bot_admin(interaction):
            return await interaction.response.send_message(
                embed=make_embed(
                    title="Permission Denied",
                    description="Administrator access is required.",
                    level="ERROR",
                ),
                ephemeral=True,
            )

        # Required selections
        if not all([
                view.verify_channel_id,
                view.log_channel_id,
                view.verified_role_id,
        ]):
            return await view.refresh(
                interaction,
                "Please select all required options before saving",
            )

        bot_member = guild.me
        if bot_member is None:
            return

        verified_role = guild.get_role(view.verified_role_id)
        unverified_role = (guild.get_role(view.unverified_role_id)
                           if view.unverified_role_id else None)

        # 🔥 Role hierarchy validation
        for role in [verified_role, unverified_role]:
            if role and role >= bot_member.top_role:
                return await interaction.response.send_message(
                    embed=make_embed(
                        title="Role Hierarchy Error",
                        description=(
                            f"I cannot manage **{role.name}**.\n\n"
                            "Move my role above this role and try again."),
                        level="ERROR",
                    ),
                    ephemeral=True,
                )

        # Save configuration
        await set_verification_config(
            guild_id=guild.id,
            verify_channel_id=view.verify_channel_id,
            log_channel_id=view.log_channel_id,
            verified_role_id=view.verified_role_id,
            unverified_role_id=view.unverified_role_id,
        )

        # Post verification message
        channel = guild.get_channel(view.verify_channel_id)
        if isinstance(channel, discord.TextChannel):
            await channel.send(
                embed=make_embed(
                    title="Server Verification",
                    description=(
                        "Verification is required to access the server.\n\n"
                        "Click the button below to begin."),
                    level="SYSTEM",
                ),
                view=VerifyButtonView(),
            )

        # Disable setup UI
        for item in view.children:
            item.disabled = True  # type: ignore

        await interaction.response.edit_message(
            embed=make_embed(
                title="Verification Configured",
                description=("The verification system is now active.\n\n"
                             "Verification message has been posted."),
                level="SUCCESS",
            ),
            view=view,
        )

        view.stop()
