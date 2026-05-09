import discord

from db.db_helpers.vc_mod_helpers.vc_manager import (
    enable_vc_manager,
)

from db.db_helpers.vc_mod_helpers.vc_tracking import (
    add_tracked_channel,
)

from utils.core.embeds import make_embed
from utils.core.emojis import EMOJIS

from utils.handlers.vc_mod_handlers.vc_helpers import (
    create_vc_role,
)

from utils.views.vc_mod_views.channel_select import (
    VCChannelSelect,
)


class VCSetupView(
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
                    description=(f"{EMOJIS['fail']} This setup panel is not for you."),
                    level="ERROR",
                ),
                ephemeral=True,
            )

            return False

        return True

    @discord.ui.button(
        label="Add Voice Channel",
        emoji=EMOJIS["folder"],
        style=discord.ButtonStyle.secondary,
    )
    async def add_mapping(
        self,
        interaction: discord.Interaction,
        _,
    ):

        view = discord.ui.View()

        view.add_item(VCChannelSelect(self.channel_callback))

        await interaction.response.send_message(
            embed=make_embed(
                title=(f"{EMOJIS['folder']} Select Voice Channel"),
                description=(
                    f"{EMOJIS['arrow_point']} "
                    f"Choose a public VC to track.\n\n"
                    f"{EMOJIS['developer']} "
                    f"The bot will automatically "
                    f"create and manage the role."
                ),
                level="INFO",
            ),
            view=view,
            ephemeral=True,
        )

    async def channel_callback(
        self,
        interaction: discord.Interaction,
        channel: discord.VoiceChannel,
    ):

        guild = interaction.guild

        if not guild:
            return

        existing = discord.utils.get(
            guild.roles,
            name=f"🎧 {channel.name}",
        )

        if existing:
            await interaction.response.edit_message(
                embed=make_embed(
                    title=(f"{EMOJIS['warning']} Already Tracked"),
                    description=(
                        f"{EMOJIS['arrow_point']} "
                        f"{channel.mention} "
                        f"is already configured."
                    ),
                    level="WARNING",
                ),
                view=None,
            )

            return

        role = await create_vc_role(
            guild,
            channel,
        )

        await add_tracked_channel(
            guild_id=guild.id,
            channel_id=channel.id,
            role_id=role.id,
            managed_role=True,
        )

        # Enable VC manager
        await enable_vc_manager(guild.id)

        await interaction.response.edit_message(
            embed=make_embed(
                title=(f"{EMOJIS['success']} Voice Channel Added"),
                description=(
                    f"{EMOJIS['arrow_point']} "
                    f"{channel.mention}\n"
                    f"{EMOJIS['moderation']} "
                    f"{role.mention}"
                ),
                level="SUCCESS",
            ),
            view=None,
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
