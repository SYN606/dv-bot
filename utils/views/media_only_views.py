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


# STICKY EMBED
def build_media_only_sticky_embed() -> discord.Embed:
    return make_embed(
        title="Media-Only Channel",
        description=
        (f"{EMOJIS['announcement']} This channel allows **media only**.\n\n"
         f"{EMOJIS['arrow_point']} Text messages will be removed.\n"
         f"{EMOJIS['arrow_point']} Images, videos, GIFs, and files are allowed."
         ),
        level="SYSTEM",
        footer=STICKY_TAG,
    )


# =====================================================
# REMOVE ALL STICKIES (FIXED)
# =====================================================
async def remove_media_only_sticky(channel: discord.TextChannel) -> None:

    try:
        async for message in channel.history(limit=50):  # increased range

            if not message.embeds:
                continue

            embed = message.embeds[0]
            footer = embed.footer.text if embed.footer else ""

            if footer and STICKY_TAG in footer:
                try:
                    await message.delete()
                except (discord.Forbidden, discord.NotFound):
                    pass

    except discord.Forbidden:
        pass


# =====================================================
# SEND OR REPLACE STICKY
# =====================================================
async def send_or_replace_sticky(channel: discord.TextChannel):

    await remove_media_only_sticky(channel)

    try:
        await channel.send(embed=build_media_only_sticky_embed())
    except discord.Forbidden:
        pass


# =====================================================
# VIEW
# =====================================================
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

    # =====================================================
    # GUARD
    # =====================================================
    async def interaction_check(self,
                                interaction: discord.Interaction) -> bool:

        if interaction.user.id != self.actor_id:
            return False

        if not await is_bot_admin(interaction):
            if not interaction.response.is_done():
                await interaction.response.send_message(
                    embed=make_embed(
                        title="Permission Denied",
                        description="You cannot use this panel.",
                        level="ERROR",
                    ),
                    ephemeral=True,
                )
            return False

        return True

    # =====================================================
    # ENABLE
    # =====================================================
    @discord.ui.button(
        label="Enable",
        emoji=EMOJIS['success'],
        style=discord.ButtonStyle.success,
    )
    async def enable(self, interaction: discord.Interaction, _):

        await interaction.response.defer()

        added = await enable_media_only(self.guild_id, self.channel.id)

        # FIXED: replace instead of spam
        await send_or_replace_sticky(self.channel)

        await interaction.edit_original_response(
            embed=make_embed(
                title="Media-Only Enabled",
                description=
                (f"{EMOJIS['success']} {self.channel.mention} is now media-only.\n\n"
                 f"{EMOJIS['arrow_point']} Non-media messages will be removed."
                 ),
                level="SUCCESS" if added else "INFO",
            ),
            view=self,
        )

    # =====================================================
    # DISABLE
    # =====================================================
    @discord.ui.button(
        label="Disable",
        emoji=EMOJIS['fail'],
        style=discord.ButtonStyle.danger,
    )
    async def disable(self, interaction: discord.Interaction, _):

        await interaction.response.defer()

        removed = await disable_media_only(self.guild_id, self.channel.id)

        if not removed:
            return await interaction.edit_original_response(
                embed=make_embed(
                    title="Media-Only Mode",
                    description=f"{EMOJIS['warning']} Not enabled.",
                    level="WARNING",
                ),
                view=self,
            )

        await remove_media_only_sticky(self.channel)

        await interaction.edit_original_response(
            embed=make_embed(
                title="Media-Only Disabled",
                description=(
                    f"{EMOJIS['success']} Restrictions removed.\n\n"
                    f"{EMOJIS['arrow_point']} Normal messages allowed."),
                level="SUCCESS",
            ),
            view=self,
        )

    # =====================================================
    # STATUS
    # =====================================================
    @discord.ui.button(
        label="Status",
        emoji="📊",
        style=discord.ButtonStyle.secondary,
    )
    async def status(self, interaction: discord.Interaction, _):

        await interaction.response.defer()

        enabled = await is_media_only(self.guild_id, self.channel.id)

        await interaction.edit_original_response(
            embed=make_embed(
                title="Media-Only Status",
                description=(f"{EMOJIS['green_dot']} Enabled"
                             if enabled else f"{EMOJIS['red_dot']} Disabled"),
                level="INFO",
            ),
            view=self,
        )

    # =====================================================
    # TIMEOUT
    # =====================================================
    async def on_timeout(self):

        for item in self.children:
            item.disabled = True  # type: ignore

        try:
            if self.message:
                await self.message.edit(
                    embed=make_embed(
                        title="Panel Expired",
                        description="Run `/media_only` again.",
                        level="WARNING",
                    ),
                    view=self,
                )
        except (discord.NotFound, discord.HTTPException):
            pass
