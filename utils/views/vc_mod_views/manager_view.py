import discord

from db.db_helpers.vc_mod_helpers.vc_manager import (
    is_vc_manager_enabled,
)

from utils.core.embeds import make_embed
from utils.core.emojis import EMOJIS

from utils.views.vc_mod_views.setup_view import (
    VCSetupView,
)

from utils.views.vc_mod_views.tracking_view import (
    VCTrackingView,
)


class VCManagerView(
    discord.ui.View,
):
    def __init__(
        self,
        author_id: int,
    ):

        super().__init__(timeout=300)

        self.author_id = author_id

    async def interaction_check(
        self,
        interaction: discord.Interaction,
    ) -> bool:

        if interaction.user.id != self.author_id:
            await interaction.response.send_message(
                embed=make_embed(
                    title="Access Denied",
                    description=(f"{EMOJIS['fail']} This panel is not for you."),
                    level="ERROR",
                ),
                ephemeral=True,
            )

            return False

        return True

    @discord.ui.button(
        label="Setup",
        emoji=EMOJIS["folder"],
        style=discord.ButtonStyle.secondary,
    )
    async def setup(
        self,
        interaction: discord.Interaction,
        _,
    ):

        configured = await is_vc_manager_enabled(interaction.guild.id)  # type: ignore

        if configured:
            await interaction.response.send_message(
                embed=make_embed(
                    title=(f"{EMOJIS['warning']} Already Configured"),
                    description=("VC manager is already setup."),
                    level="WARNING",
                ),
                ephemeral=True,
            )

            return

        embed = make_embed(
            title=(f"{EMOJIS['developer']} VC Manager Setup"),
            description=(
                f"{EMOJIS['arrow_point']} Configure VC tracking and linked roles."
            ),
            level="INFO",
        )

        await interaction.response.send_message(
            embed=embed,
            view=VCSetupView(interaction.user.id),
            ephemeral=True,
        )

    @discord.ui.button(
        label="Tracked Channels",
        emoji=EMOJIS["moderation"],
        style=discord.ButtonStyle.secondary,
    )
    async def tracked_channels(
        self,
        interaction: discord.Interaction,
        _,
    ):

        embed = make_embed(
            title=(f"{EMOJIS['folder']} Tracked Channels"),
            description=("Manage tracked VC channel mappings."),
            level="INFO",
        )

        await interaction.response.send_message(
            embed=embed,
            view=VCTrackingView(interaction.user.id),
            ephemeral=True,
        )

    @discord.ui.button(
        label="Close",
        emoji=EMOJIS["fail"],
        style=discord.ButtonStyle.danger,
    )
    async def close(
        self,
        interaction: discord.Interaction,
        _,
    ):

        await interaction.message.delete()  # type: ignore
