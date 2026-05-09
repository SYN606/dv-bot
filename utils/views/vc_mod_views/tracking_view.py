import discord

from db.db_helpers.vc_mod_helpers.vc_tracking import (
    get_guild_tracked_channels, )

from utils.core.embeds import make_embed
from utils.core.emojis import EMOJIS


class VCTrackingView(
        discord.ui.View, ):

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

        return (interaction.user.id == self.author_id)

    @discord.ui.button(
        label="Refresh",
        emoji=EMOJIS["rounded_loading"],
        style=discord.ButtonStyle.secondary,
    )
    async def refresh(
        self,
        interaction: discord.Interaction,
        _,
    ):

        data = await get_guild_tracked_channels(interaction.guild.id) # type: ignore

        if not data:

            embed = make_embed(
                title=(f"{EMOJIS['warning']} "
                       f"No Tracked Channels"),
                level="WARNING",
            )

        else:

            lines = []

            for item in data:

                channel = interaction.guild.get_channel(item.channel_id) # type: ignore

                role = interaction.guild.get_role(item.role_id) # type: ignore

                if not channel or not role:
                    continue

                lines.append(f"{EMOJIS['arrow_point']} "
                             f"{channel.mention} "
                             f"→ {role.mention}")

            embed = make_embed(
                title=(f"{EMOJIS['folder']} "
                       f"Tracked VC Channels"),
                description=("\n".join(lines) or "No mappings found."),
                level="INFO",
            )

        await interaction.response.edit_message(
            embed=embed,
            view=self,
        )
