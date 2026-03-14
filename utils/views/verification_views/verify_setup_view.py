import asyncio
import discord
from discord.ui import View, Button, ChannelSelect, RoleSelect

from sqlalchemy import select
from db.engine import AsyncSessionLocal
from db.models import VerificationConfig

from utils.embeds import make_embed
from utils.check_perms import is_bot_admin
from db.db_helpers.verification import set_verification_config
from utils.views.verification_views.verify_button_view import VerifyButtonView


class VerifySetupView(View):

    def __init__(self, guild: discord.Guild, actor_id: int):
        super().__init__(timeout=300)

        self.guild = guild
        self.actor_id = actor_id
        self.message: discord.Message | None = None

        self.verify_channel_id: int | None = None
        self.log_channel_id: int | None = None
        self.verified_role_id: int | None = None
        self.unverified_role_id: int | None = None

        self.notice: str | None = None

        # rate limit protection
        self._last_refresh = 0

        self.add_item(VerifyChannelSelect(self))
        self.add_item(LogChannelSelect(self))
        self.add_item(VerifiedRoleSelect(self))
        self.add_item(UnverifiedRoleSelect(self))
        self.add_item(VerifySetupSaveButton())

    # ─────────────────────────
    # INTERACTION SECURITY
    # ─────────────────────────
    async def interaction_check(self,
                                interaction: discord.Interaction) -> bool:

        if interaction.user.id != self.actor_id:
            return False

        if not await is_bot_admin(interaction):
            return False

        return True

    # ─────────────────────────
    # EMBED BUILDER
    # ─────────────────────────
    def build_embed(self) -> discord.Embed:

        def status(value: int | None, kind: str):

            if not value:
                return "❌ Not configured"

            if kind == "channel":
                return f"✅ <#{value}>"

            if kind == "role":
                return f"✅ <@&{value}>"

            return "Unknown"

        embed = make_embed(
            title="🔐 Verification Setup Panel",
            description=("Configure the server verification system.\n"
                         "Use the selectors below then click **Save**."),
            level="SYSTEM",
        )

        embed.add_field(
            name="Verification Channel",
            value=status(self.verify_channel_id, "channel"),
            inline=True,
        )

        embed.add_field(
            name="Log Channel",
            value=status(self.log_channel_id, "channel"),
            inline=True,
        )

        embed.add_field(
            name="Verified Role",
            value=status(self.verified_role_id, "role"),
            inline=True,
        )

        embed.add_field(
            name="Unverified Role (Optional)",
            value=status(self.unverified_role_id, "role"),
            inline=True,
        )

        embed.add_field(
            name="Setup Instructions",
            value=("1️⃣ Select the required options\n"
                   "2️⃣ Confirm configuration\n"
                   "3️⃣ Click **Save & Post Verification Message**"),
            inline=False,
        )

        embed.set_footer(
            text=self.notice or "Waiting for configuration selections...")

        return embed

    # ─────────────────────────
    # SAFE REFRESH (rate-limit safe)
    # ─────────────────────────
    async def refresh(self, interaction: discord.Interaction, notice=None):

        if notice:
            self.notice = notice

        now = asyncio.get_event_loop().time()

        # prevent selector spam
        if now - self._last_refresh < 0.6:
            return

        self._last_refresh = now

        try:

            if not interaction.response.is_done():

                await interaction.response.edit_message(
                    embed=self.build_embed(),
                    view=self,
                )

            else:

                await interaction.edit_original_response(
                    embed=self.build_embed(),
                    view=self,
                )

        except discord.NotFound:
            pass

    # ─────────────────────────
    # VIEW TIMEOUT
    # ─────────────────────────
    async def on_timeout(self):

        for item in self.children:
            item.disabled = True  # type: ignore

        if self.message:
            try:
                await self.message.edit(
                    content="Verification setup timed out.",
                    view=self,
                )
            except (discord.NotFound, discord.HTTPException):
                pass


# ─────────────────────────
# CHANNEL SELECTORS
# ─────────────────────────
class VerifyChannelSelect(ChannelSelect):

    def __init__(self, view: VerifySetupView):
        super().__init__(
            placeholder="📨 Select verification channel",
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
            placeholder="📜 Select verification log channel",
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


# ─────────────────────────
# ROLE SELECTORS
# ─────────────────────────
class VerifiedRoleSelect(RoleSelect):

    def __init__(self, view: VerifySetupView):
        super().__init__(
            placeholder="🟢 Select verified role",
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
            placeholder="🔴 Select unverified role (optional)",
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


# ─────────────────────────
# SAVE BUTTON
# ─────────────────────────
class VerifySetupSaveButton(Button):

    def __init__(self):
        super().__init__(
            label="Save & Post Verification Message",
            style=discord.ButtonStyle.success,
        )

    async def callback(self, interaction: discord.Interaction):

        view: VerifySetupView = self.view  # type: ignore
        guild = interaction.guild

        if not guild:
            return

        if not all([
                view.verify_channel_id,
                view.log_channel_id,
                view.verified_role_id,
        ]):
            return await view.refresh(
                interaction,
                "Please configure all required options before saving",
            )

        bot_member = guild.me
        if not bot_member:
            return

        verified_role = guild.get_role(view.verified_role_id) # type: ignore
        unverified_role = (guild.get_role(view.unverified_role_id)
                           if view.unverified_role_id else None)

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

        try:
            await interaction.response.defer()
        except discord.NotFound:
            return

        # save configuration
        await set_verification_config(
            guild_id=guild.id,
            verify_channel_id=view.verify_channel_id, # type: ignore
            log_channel_id=view.log_channel_id, # type: ignore
            verified_role_id=view.verified_role_id, # type: ignore
            unverified_role_id=view.unverified_role_id,
        )

        channel = guild.get_channel(view.verify_channel_id) # type: ignore

        if isinstance(channel, discord.TextChannel):

            async with AsyncSessionLocal() as session:

                result = await session.execute(
                    select(VerificationConfig).where(
                        VerificationConfig.guild_id == guild.id))

                row = result.scalar_one_or_none()

                # delete old verification message safely
                if row and row.verification_message_id:

                    try:
                        old = channel.get_partial_message(
                            row.verification_message_id)
                        await old.delete()
                    except discord.HTTPException:
                        pass

                # smooth API usage
                await asyncio.sleep(0.4)

                msg = await channel.send(
                    embed=make_embed(
                        title="Server Verification",
                        description=(
                            "Verification is required to access the server.\n\n"
                            "Click the button below to begin."),
                        level="SYSTEM",
                    ),
                    view=VerifyButtonView(),
                )

                if row:
                    row.verification_message_id = msg.id
                    await session.commit()

        for item in view.children:
            item.disabled = True  # type: ignore

        try:
            await interaction.edit_original_response(
                embed=make_embed(
                    title="Verification Configured",
                    description=("The verification system is now active.\n\n"
                                 "Verification message has been posted."),
                    level="SUCCESS",
                ),
                view=view,
            )
        except discord.NotFound:
            pass

        view.stop()
