import discord

from db.db_helpers.media_only import (
    disable_media_only,
    enable_media_only,
    is_media_only,
)
from utils.core.embeds import make_embed
from utils.core.emojis import EMOJIS
from utils.handlers.media_only import STICKY_TAG, build_media_only_sticky_embed
from utils.permissions.check_perms import is_bot_admin


async def remove_media_only_sticky(channel: discord.TextChannel) -> None:
    """Scan channel history and remove any existing media-only sticky embed."""
    try:
        async for message in channel.history(limit=50):
            if (message.embeds and message.embeds[0].footer
                    and STICKY_TAG in (message.embeds[0].footer.text or "")):
                try:
                    await message.delete()
                except (discord.Forbidden, discord.NotFound):
                    pass
    except discord.Forbidden:
        pass


async def send_or_replace_sticky(channel: discord.TextChannel) -> None:
    """Remove existing sticky message and dispatch a fresh media-only sticky embed."""
    await remove_media_only_sticky(channel)
    try:
        await channel.send(embed=build_media_only_sticky_embed())
    except discord.Forbidden:
        pass


class MediaOnlyView(discord.ui.View):
    """
    Control view for toggling media-only mode for a specific channel.
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
        self.message: discord.Message | None = None

    async def interaction_check(
        self,
        interaction: discord.Interaction,
    ) -> bool:
        """Ensure only the command caller and bot admins can interact."""
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

    @discord.ui.button(
        label="Enable",
        emoji=EMOJIS["success"],
        style=discord.ButtonStyle.success,
    )
    async def enable(
        self,
        interaction: discord.Interaction,
        _button: discord.ui.Button,
    ):
        """Enable media-only restrictions in the target channel."""
        await interaction.response.defer()
        added = await enable_media_only(self.guild_id, self.channel.id)
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

    @discord.ui.button(
        label="Disable",
        emoji=EMOJIS["fail"],
        style=discord.ButtonStyle.danger,
    )
    async def disable(
        self,
        interaction: discord.Interaction,
        _button: discord.ui.Button,
    ):
        """Disable media-only restrictions in the target channel."""
        await interaction.response.defer()
        if not await disable_media_only(self.guild_id, self.channel.id):
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

    @discord.ui.button(
        label="Status",
        emoji=EMOJIS["moderation"],
        style=discord.ButtonStyle.secondary,
    )
    async def status(
        self,
        interaction: discord.Interaction,
        _button: discord.ui.Button,
    ):
        """Check current media-only status for the target channel."""
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

    async def on_timeout(self):
        """Disable buttons upon view timeout."""
        for item in self.children:
            if isinstance(item, (discord.ui.Button, discord.ui.Select)):
                item.disabled = True

        try:
            if self.message:
                await self.message.edit(embed=make_embed(
                    title="Panel Expired",
                    description=f"{EMOJIS['warning']} Run `/media_only` again.",
                    level="WARNING"),
                                        view=self)
        except (discord.NotFound, discord.HTTPException):
            pass
