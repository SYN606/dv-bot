import discord

from db.db_helpers.vc_mod_helpers.vc_tracking import (
    remove_tracked_channel,
)

from utils.core.embeds import make_embed
from utils.core.emojis import EMOJIS

from utils.handlers.vc_mod_handlers.cache_handler import (
    VC_ROLE_CACHE,
    remove_cache_mapping,
)

from utils.handlers.vc_mod_handlers.vc_helpers import (
    delete_vc_role,
)


class VCTrackingView(
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

    # =====================================
    # INTERACTION CHECK
    # =====================================

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

    # =====================================
    # BUILD EMBED
    # =====================================

    async def build_embed(
        self,
        guild: discord.Guild,
    ) -> discord.Embed:

        guild_cache = VC_ROLE_CACHE.get(
            guild.id,
            {},
        )

        if not guild_cache:
            return make_embed(
                title=(f"{EMOJIS['warning']} No Tracked Channels"),
                description=("No VC channels are currently tracked."),
                level="WARNING",
            )

        lines = []

        for channel_id, data in guild_cache.items():
            channel = guild.get_channel(
                channel_id,
            )

            role = guild.get_role(
                data["role_id"],
            )

            if not channel or not role:
                continue

            enabled = "Enabled" if data["enabled"] else "Disabled"

            auto_role = "Auto Role" if data["auto_role"] else "Manual"

            lines.append(
                f"{EMOJIS['arrow_point']} "
                f"{channel.mention} "
                f"→ {role.mention}\n"
                f"└ `{enabled}` | `{auto_role}`"
            )

        return make_embed(
            title=(f"{EMOJIS['folder']} Tracked VC Channels"),
            description=("\n\n".join(lines) or "No mappings found."),
            level="INFO",
        )

    # =====================================
    # REFRESH BUTTON
    # =====================================

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

        embed = await self.build_embed(
            interaction.guild,  # type: ignore
        )

        await interaction.response.edit_message(
            embed=embed,
            view=self,
        )

    # =====================================
    # CLEANUP BUTTON
    # =====================================

    @discord.ui.button(
        label="Cleanup",
        emoji=EMOJIS["warning"],
        style=discord.ButtonStyle.secondary,
    )
    async def cleanup(
        self,
        interaction: discord.Interaction,
        _,
    ):

        guild = interaction.guild

        if not guild:
            return

        guild_cache = VC_ROLE_CACHE.get(
            guild.id,
            {},
        ).copy()

        if not guild_cache:
            await interaction.response.edit_message(
                embed=make_embed(
                    title=(f"{EMOJIS['warning']} No Tracked Channels"),
                    description=("There are no tracked VC mappings to cleanup."),
                    level="WARNING",
                ),
                view=self,
            )

            return

        removed = 0
        deleted_roles = 0

        for channel_id, data in guild_cache.items():
            role = guild.get_role(
                data["role_id"],
            )

            # ==============================
            # DELETE ROLE
            # ==============================

            if role:
                success = await delete_vc_role(
                    role,
                )

                if success:
                    deleted_roles += 1

            # ==============================
            # REMOVE DB ENTRY
            # ==============================

            await remove_tracked_channel(
                guild.id,
                channel_id,
            )

            # ==============================
            # REMOVE CACHE ENTRY
            # ==============================

            remove_cache_mapping(
                guild.id,
                channel_id,
            )

            removed += 1

        embed = make_embed(
            title=(f"{EMOJIS['success']} Cleanup Complete"),
            description=(
                f"{EMOJIS['arrow_point']} "
                f"Removed `{removed}` tracked mappings.\n"
                f"{EMOJIS['moderation']} "
                f"Deleted `{deleted_roles}` VC roles."
            ),
            level="SUCCESS",
        )

        await interaction.response.edit_message(
            embed=embed,
            view=self,
        )

    # =====================================
    # CLOSE BUTTON
    # =====================================

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
