import discord
from discord.ui import View, Button, ChannelSelect, RoleSelect
from utils.core.emojis import EMOJIS
from utils.core.embeds import make_embed
from utils.permissions.check_perms import is_bot_admin
from utils.logging.mod_log import send_mod_log
from db.db_helpers.verification import (set_verification_config,
                                        get_verification_config,
                                        delete_verification_config)
from utils.views.verification_views.verify_button_view import VerifyButtonView


class VerificationView(View):

    def __init__(self, bot, guild: discord.Guild, actor: discord.Member):
        super().__init__(timeout=300)
        self.bot = bot
        self.guild = guild
        self.actor = actor
        self.message: discord.Message | None = None

        self.verify_channel_id = None
        self.log_channel_id = None
        self.verified_role_id = None
        self.unverified_role_id = None
        self.notice = None

        self.build_panel()

    def build_panel(self):
        self.clear_items()
        self.add_item(SetupButton())
        self.add_item(ResetButton())

    def build_setup(self):
        self.clear_items()
        self.add_item(VerifyChannelSelect(self))
        self.add_item(LogChannelSelect(self))
        self.add_item(VerifiedRoleSelect(self))
        self.add_item(UnverifiedRoleSelect(self))
        self.add_item(SaveButton())

    async def interaction_check(self,
                                interaction: discord.Interaction) -> bool:
        if interaction.user.id != self.actor.id:
            await interaction.response.send_message(
                f"{EMOJIS['fail']} Not your panel.", ephemeral=True)
            return False
        return await is_bot_admin(interaction)

    def panel_embed(self):
        return make_embed(
            title=f"{EMOJIS['moderation']} Verification Panel",
            description="Choose an action below.",
            level="SYSTEM",
        )

    def setup_embed(self):

        def status(val, kind):
            if not val:
                return f"{EMOJIS['fail']} Not set"
            return f"{EMOJIS['success']} <#{val}>" if kind == "channel" else f"{EMOJIS['success']} <@&{val}>"

        embed = make_embed(
            title=f"{EMOJIS['moderation']} Verification Setup",
            description="Configure and click save.",
            level="SYSTEM",
            footer=self.notice or "Waiting for input...",
        )
        embed.add_field(name="Verify Channel",
                        value=status(self.verify_channel_id, "channel"))
        embed.add_field(name="Log Channel",
                        value=status(self.log_channel_id, "channel"))
        embed.add_field(name="Verified Role",
                        value=status(self.verified_role_id, "role"))
        embed.add_field(name="Unverified Role",
                        value=status(self.unverified_role_id, "role"))
        return embed

    async def refresh(self, interaction: discord.Interaction, notice=None):
        if notice:
            self.notice = notice
        try:
            if not interaction.response.is_done():
                await interaction.response.edit_message(
                    embed=self.setup_embed(), view=self)
            else:
                await interaction.edit_original_response(
                    embed=self.setup_embed(), view=self)
        except discord.NotFound:
            pass


class SetupButton(Button):

    def __init__(self):
        super().__init__(label="Setup",
                         style=discord.ButtonStyle.success,
                         emoji=EMOJIS["okay"])

    async def callback(self, interaction: discord.Interaction):
        view: VerificationView = self.view  # type: ignore
        view.build_setup()
        await interaction.response.edit_message(embed=view.setup_embed(),
                                                view=view)


class ResetButton(Button):

    def __init__(self):
        super().__init__(label="Reset",
                         style=discord.ButtonStyle.danger,
                         emoji=EMOJIS["warning"])

    async def callback(self, interaction: discord.Interaction):
        await interaction.response.send_modal(
            ResetModal(self.view)  # type: ignore
        )


class VerifyChannelSelect(ChannelSelect):

    def __init__(self, view):
        super().__init__(channel_types=[discord.ChannelType.text],
                         placeholder="Select Verification Channel...")
        self.view_ref = view

    async def callback(self, interaction: discord.Interaction):
        self.view_ref.verify_channel_id = self.values[0].id
        await self.view_ref.refresh(interaction,
                                    f"{EMOJIS['success']} Verify channel set")


class LogChannelSelect(ChannelSelect):

    def __init__(self, view):
        super().__init__(channel_types=[discord.ChannelType.text],
                         placeholder="Select Log Channel...")
        self.view_ref = view

    async def callback(self, interaction: discord.Interaction):
        self.view_ref.log_channel_id = self.values[0].id
        await self.view_ref.refresh(interaction,
                                    f"{EMOJIS['success']} Log channel set")


class VerifiedRoleSelect(RoleSelect):

    def __init__(self, view):
        super().__init__(placeholder="Select Verified Role...")
        self.view_ref = view

    async def callback(self, interaction: discord.Interaction):
        self.view_ref.verified_role_id = self.values[0].id
        await self.view_ref.refresh(interaction,
                                    f"{EMOJIS['success']} Verified role set")


class UnverifiedRoleSelect(RoleSelect):

    def __init__(self, view):
        super().__init__(min_values=0,
                         max_values=1,
                         placeholder="Select Unverified Role (Optional)...")
        self.view_ref = view

    async def callback(self, interaction: discord.Interaction):
        self.view_ref.unverified_role_id = self.values[
            0].id if self.values else None
        await self.view_ref.refresh(
            interaction, f"{EMOJIS['success']} Unverified role updated")


class SaveButton(Button):

    def __init__(self):
        super().__init__(label="Save",
                         style=discord.ButtonStyle.success,
                         emoji=EMOJIS["success"])

    async def callback(self, interaction: discord.Interaction):
        view: VerificationView = self.view  # type: ignore
        guild = interaction.guild

        if not all([
                view.verify_channel_id, view.log_channel_id,
                view.verified_role_id
        ]):
            await view.refresh(interaction,
                               f"{EMOJIS['fail']} Fill all required fields")
            return

        await interaction.response.defer()
        await set_verification_config(
            guild_id=guild.id,  # type: ignore
            verify_channel_id=view.verify_channel_id,
            log_channel_id=view.log_channel_id,
            verified_role_id=view.verified_role_id,
            unverified_role_id=view.unverified_role_id,
        )

        channel = guild.get_channel(view.verify_channel_id)  # type: ignore
        if isinstance(channel, discord.TextChannel):
            await channel.send(
                embed=make_embed(
                    title=f"{EMOJIS['welcome']} Verification Required",
                    description=
                    "Click the button below to verify your account.",
                    level="SYSTEM",
                ),
                view=VerifyButtonView(),
            )

        await send_mod_log(
            guild=guild,  # type: ignore
            category="VERIFY",
            title=f"{EMOJIS['success']} Verification Enabled",
            description=
            f"Verification system configured.\nChannel: <#{view.verify_channel_id}>\nRole: <@&{view.verified_role_id}>",
            level="SUCCESS",
            actor=interaction.user,
        )
        await interaction.edit_original_response(
            embed=make_embed(title=f"{EMOJIS['success']} Done",
                             description="Verification enabled successfully.",
                             level="SUCCESS"),
            view=None,
        )


class ResetModal(discord.ui.Modal, title="Confirm Reset"):
    confirm = discord.ui.TextInput(label="Type YES to confirm reset")

    def __init__(self, view: VerificationView):
        super().__init__()
        self.view = view

    async def on_submit(self, interaction: discord.Interaction) -> None:
        if interaction.user.id != self.view.actor.id:
            await interaction.response.send_message(
                f"{EMOJIS['fail']} Not your panel.", ephemeral=True)
            return

        if self.confirm.value != "YES":
            await interaction.response.send_message(
                f"{EMOJIS['warning']} Cancelled", ephemeral=True)
            return

        config = await get_verification_config(self.view.guild.id)
        if not config:
            await interaction.response.send_message(
                f"{EMOJIS['fail']} No verification system found.",
                ephemeral=True)
            return

        await delete_verification_config(self.view.guild.id)
        await send_mod_log(
            guild=self.view.guild,
            category="VERIFY",
            title=f"{EMOJIS['warning']} Verification Disabled",
            description="Verification system was reset.",
            level="WARNING",
            actor=interaction.user,
        )
        await interaction.response.send_message(
            f"{EMOJIS['success']} Verification reset successfully.",
            ephemeral=True)
