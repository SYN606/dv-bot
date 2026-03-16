import discord

from utils.core.embeds import make_embed
from utils.core.emojis import EMOJIS
from utils.permissions.check_perms import is_bot_admin
from db.db_helpers.media_only import (
    enable_media_only,
    disable_media_only,
    is_media_only,
)

STICKY_TAG = "MEDIA_ONLY_STICKY_NOTICE"


# ─────────────────────────────────────
# Helper: build sticky embed
# ─────────────────────────────────────
def build_media_only_sticky_embed() -> discord.Embed:
    return make_embed(
        title="Media-Only Channel",
        description=
        (f"{EMOJIS['announcement']} This channel is restricted to **media messages only**.\n\n"
         f"{EMOJIS['arrow_point']} Text-only messages will be automatically deleted.\n"
         f"{EMOJIS['arrow_point']} Images, videos, GIFs, and files are allowed."
         ),
        level="SYSTEM",
        footer=STICKY_TAG,
    )


# ─────────────────────────────────────
# Remove sticky
# ─────────────────────────────────────
async def remove_media_only_sticky(channel: discord.TextChannel) -> None:
    try:
        async for message in channel.history(limit=15):
            if not message.embeds:
                continue

            embed = message.embeds[0]
            footer = embed.footer.text if embed.footer else ""

            if footer and STICKY_TAG in footer:
                try:
                    await message.delete()
                except (discord.Forbidden, discord.NotFound):
                    pass
                break
    except discord.Forbidden:
        pass


# ─────────────────────────────────────
# MEDIA ONLY VIEW
# ─────────────────────────────────────
class MediaOnlyView(discord.ui.View):

    def __init__(
        self,
        *,
        guild_id: int,
        channel: discord.TextChannel,
        actor_id: int,
    ):
        super().__init__(timeout=120)

        self.guild_id = guild_id
        self.channel = channel
        self.actor_id = actor_id
        self.message: discord.Message | None = None

    # ─────────────────────────
    # Secure Interaction guard
    # ─────────────────────────
    async def interaction_check(
        self,
        interaction: discord.Interaction,
    ) -> bool:

        if interaction.user.id != self.actor_id:
            return False

        if not await is_bot_admin(interaction):
            try:
                if not interaction.response.is_done():
                    await interaction.response.send_message(
                        embed=make_embed(
                            title="Permission Denied",
                            description=
                            "You are not allowed to use this panel.",
                            level="ERROR",
                        ),
                        ephemeral=True,
                    )
            except discord.NotFound:
                pass
            return False

        return True

    # ─────────────────────────
    # ENABLE
    # ─────────────────────────
    @discord.ui.button(
        label="Enable",
        emoji=EMOJIS["green_dot"],
        style=discord.ButtonStyle.success,
    )
    async def enable(self, interaction: discord.Interaction, _):

        try:
            await interaction.response.defer()
        except discord.NotFound:
            return

        added = await enable_media_only(
            self.guild_id,
            self.channel.id,
        )

        # Optional: post sticky notice
        try:
            await self.channel.send(embed=build_media_only_sticky_embed())
        except discord.Forbidden:
            pass

        try:
            await interaction.edit_original_response(
                embed=make_embed(
                    title="Media-Only Enabled",
                    description=
                    (f"{EMOJIS['success']} {self.channel.mention} is now media-only.\n\n"
                     f"{EMOJIS['arrow_point']} Non-media messages will be removed automatically."
                     ),
                    level="SUCCESS" if added else "INFO",
                ),
                view=self,
            )
        except discord.NotFound:
            pass

    # ─────────────────────────
    # DISABLE
    # ─────────────────────────
    @discord.ui.button(
        label="Disable",
        emoji=EMOJIS["red_dot"],
        style=discord.ButtonStyle.danger,
    )
    async def disable(self, interaction: discord.Interaction, _):

        try:
            await interaction.response.defer()
        except discord.NotFound:
            return

        removed = await disable_media_only(
            self.guild_id,
            self.channel.id,
        )

        if not removed:
            try:
                await interaction.edit_original_response(
                    embed=make_embed(
                        title="Media-Only Mode",
                        description=
                        (f"{EMOJIS['warning']} {self.channel.mention} is not media-only."
                         ),
                        level="WARNING",
                    ),
                    view=self,
                )
            except discord.NotFound:
                pass
            return

        await remove_media_only_sticky(self.channel)

        try:
            await interaction.edit_original_response(
                embed=make_embed(
                    title="Media-Only Disabled",
                    description=
                    (f"{EMOJIS['success']} Media-only restrictions removed.\n\n"
                     f"{EMOJIS['arrow_point']} Normal messages are now allowed."
                     ),
                    level="SUCCESS",
                ),
                view=self,
            )
        except discord.NotFound:
            pass

    # ─────────────────────────
    # STATUS
    # ─────────────────────────
    @discord.ui.button(
        label="Status",
        emoji=EMOJIS["pants"],
        style=discord.ButtonStyle.secondary,
    )
    async def status(self, interaction: discord.Interaction, _):

        try:
            await interaction.response.defer()
        except discord.NotFound:
            return

        enabled = await is_media_only(
            self.guild_id,
            self.channel.id,
        )

        try:
            await interaction.edit_original_response(
                embed=make_embed(
                    title="Media-Only Status",
                    description=
                    (f"{EMOJIS['green_dot']} {self.channel.mention} is media-only."
                     if enabled else
                     f"{EMOJIS['red_dot']} {self.channel.mention} is not media-only."
                     ),
                    level="INFO",
                ),
                view=self,
            )
        except discord.NotFound:
            pass

    # ─────────────────────────
    # TIMEOUT
    # ─────────────────────────
    async def on_timeout(self) -> None:

        for item in self.children:
            item.disabled = True # type: ignore

        try:
            if self.message:
                await self.message.edit(
                    embed=make_embed(
                        title="Media-Only Panel Expired",
                        description=
                        (f"{EMOJIS['warning']} This control panel has timed out.\n"
                         f"{EMOJIS['arrow_point']} Run `/media_only` again if needed."
                         ),
                        level="WARNING",
                    ),
                    view=self,
                )
        except (discord.NotFound, discord.HTTPException):
            pass
