import discord

from utils.embeds import make_embed
from utils.emojis import EMOJIS
from utils.check_perms import is_bot_admin
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
         f"{EMOJIS['arrow_point']} Text-only messages will be **automatically deleted**.\n"
         f"{EMOJIS['arrow_point']} Images, videos, GIFs, and files are allowed."
         ),
        level="SYSTEM",
        footer=STICKY_TAG,
    )


# ─────────────────────────────────────
# Helper: remove sticky
# ─────────────────────────────────────
async def remove_media_only_sticky(channel: discord.TextChannel) -> None:
    async for message in channel.history(limit=25):
        if not message.embeds:
            continue

        embed = message.embeds[0]
        footer = embed.footer.text if embed.footer else ""

        if STICKY_TAG in footer:
            try:
                await message.delete()
            except discord.Forbidden:
                pass
            break


# ─────────────────────────────────────
# MEDIA ONLY VIEW (v2.1 – HANDLER ALIGNED)
# ─────────────────────────────────────
class MediaOnlyView(discord.ui.View):
    """
    Media-Only Control Panel (v2.1)

    - Single ephemeral message
    - Button-driven
    - DB is the source of truth
    - Sticky enforcement handled by message handler
    """

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

    # ─────────────────────────
    # Interaction guard
    # ─────────────────────────
    async def interaction_check(
        self,
        interaction: discord.Interaction,
    ) -> bool:
        return (interaction.user.id == self.actor_id
                and is_bot_admin(interaction))

    # ─────────────────────────
    # ENABLE BUTTON
    # ─────────────────────────
    @discord.ui.button(
        label="Enable",
        emoji=EMOJIS["green_dot"],
        style=discord.ButtonStyle.success,
    )
    async def enable(
        self,
        interaction: discord.Interaction,
        _: discord.ui.Button,
    ):
        added = enable_media_only(self.guild_id, self.channel.id)

        await interaction.response.edit_message(
            embed=make_embed(
                title="Media-Only Enabled",
                description=
                (f"{EMOJIS['success']} {self.channel.mention} is now **media-only**.\n\n"
                 f"{EMOJIS['arrow_point']} Non-media messages will be removed automatically."
                 ),
                level="SUCCESS" if added else "INFO",
            ),
            view=self,
        )

    # ─────────────────────────
    # DISABLE BUTTON
    # ─────────────────────────
    @discord.ui.button(
        label="Disable",
        emoji=EMOJIS["red_dot"],
        style=discord.ButtonStyle.danger,
    )
    async def disable(
        self,
        interaction: discord.Interaction,
        _: discord.ui.Button,
    ):
        removed = disable_media_only(self.guild_id, self.channel.id)

        if not removed:
            await interaction.response.edit_message(
                embed=make_embed(
                    title="Media-Only Mode",
                    description=
                    (f"{EMOJIS['warning']} {self.channel.mention} is not media-only."
                     ),
                    level="WARNING",
                ),
                view=self,
            )
            return

        # Explicitly remove sticky on disable
        await remove_media_only_sticky(self.channel)

        await interaction.response.edit_message(
            embed=make_embed(
                title="Media-Only Disabled",
                description=
                (f"{EMOJIS['success']} Media-only restrictions have been removed.\n\n"
                 f"{EMOJIS['arrow_point']} Normal messages are now allowed."),
                level="SUCCESS",
            ),
            view=self,
        )

    # ─────────────────────────
    # STATUS BUTTON
    # ─────────────────────────
    @discord.ui.button(
        label="Status",
        emoji=EMOJIS["pants"],
        style=discord.ButtonStyle.secondary,
    )
    async def status(
        self,
        interaction: discord.Interaction,
        _: discord.ui.Button,
    ):
        enabled = is_media_only(self.guild_id, self.channel.id)

        await interaction.response.edit_message(
            embed=make_embed(
                title="Media-Only Status",
                description=
                (f"{EMOJIS['green_dot']} {self.channel.mention} is currently **media-only**."
                 if enabled else
                 f"{EMOJIS['red_dot']} {self.channel.mention} is **not** media-only."
                 ),
                level="INFO",
            ),
            view=self,
        )

    # ─────────────────────────
    # TIMEOUT
    # ─────────────────────────
    async def on_timeout(self) -> None:
        for item in self.children:
            item.disabled = True  # type: ignore

        try:
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
        except Exception:
            pass
