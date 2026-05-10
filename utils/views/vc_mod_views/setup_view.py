import discord

from db.db_helpers.vc_mod_helpers.vc_manager import (
    enable_vc_manager,
)

from db.db_helpers.vc_mod_helpers.vc_tracking import (
    add_tracked_channel,
    is_channel_tracked,
)

from utils.core.embeds import make_embed
from utils.core.emojis import EMOJIS

from utils.handlers.vc_mod_handlers.cache_handler import (
    set_cache_mapping,
)

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

        super().__init__(
            timeout=300,
        )

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

        view.add_item(
            VCChannelSelect(
                self.channel_callback,
            )
        )

        await interaction.response.send_message(
            embed=make_embed(
                title=(f"{EMOJIS['folder']} Select Voice Channel"),
                description=(
                    f"{EMOJIS['arrow_point']} "
                    f"Choose a VC to track.\n\n"
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

        tracked = await is_channel_tracked(
            guild.id,
            channel.id,
        )

        if tracked:
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

        me = guild.me

        if not me:
            await interaction.response.edit_message(
                embed=make_embed(
                    title=(f"{EMOJIS['fail']} Bot Error"),
                    description=("Unable to access bot member."),
                    level="ERROR",
                ),
                view=None,
            )

            return

        role = await create_vc_role(
            guild,
            channel,
        )

        if role >= me.top_role:
            await interaction.response.edit_message(
                embed=make_embed(
                    title=(f"{EMOJIS['fail']} Hierarchy Error"),
                    description=("Move the bot role above VC roles before setup."),
                    level="ERROR",
                ),
                view=None,
            )

            return

        await add_tracked_channel(
            guild_id=guild.id,
            channel_id=channel.id,
            role_id=role.id,
            managed_role=True,
        )

        # Update cache instantly
        set_cache_mapping(
            guild_id=guild.id,
            channel_id=channel.id,
            role_id=role.id,
            managed_role=True,
        )

        # Enable manager
        await enable_vc_manager(
            guild.id,
        )

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

        try:
            await interaction.message.delete()  # type: ignore

        except discord.HTTPException:
            pass
