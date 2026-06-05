import time
import discord
from utils.core.embeds import make_embed
from utils.core.emojis import EMOJIS


class BaseMediaView(discord.ui.View):
    """Reusable media switcher UI View for Avatars, Banners, Icons, etc."""

    def __init__(
        self,
        *,
        requester_id: int,
        requester_name: str,
        global_url: str | None,
        server_url: str | None,
        active: str = "server",
        title: str,
        server_label: str,
        global_label: str,
    ):
        super().__init__(timeout=60)
        self.requester_id = requester_id
        self.requester_name = requester_name
        self.global_url = global_url
        self.server_url = server_url
        self.active = active
        self.title = title
        self.server_label = server_label
        self.global_label = global_label
        self.message: discord.Message | None = None

        self._sync_buttons()

    def _sync_buttons(self) -> None:
        self.clear_items()
        if self.server_url:
            self.add_item(
                MediaButton(view=self,
                            media_type="server",
                            label=self.server_label,
                            style=discord.ButtonStyle.primary))
        if self.global_url:
            self.add_item(
                MediaButton(view=self,
                            media_type="global",
                            label=self.global_label,
                            style=discord.ButtonStyle.secondary))

    async def interaction_check(self,
                                interaction: discord.Interaction) -> bool:
        if interaction.user.id != self.requester_id:
            await interaction.response.send_message(
                embed=make_embed(
                    title="Unauthorized",
                    description=
                    f"{EMOJIS['fail']} You cannot use this interaction.",
                    level="ERROR",
                ),
                ephemeral=True,
            )
            return False
        return True

    def build_embed(self) -> discord.Embed:
        is_server = self.active == "server"
        url = self.server_url if is_server else self.global_url
        state = self.server_label if is_server else self.global_label

        embed = make_embed(
            title=self.title,
            description=f"Switch between available {self.title.lower()}.",
            level="INFO",
            footer=f"{state} • Requested by {self.requester_name}",
        )
        if url:
            # Cache buster parameter ensures Discord client updates image instantly
            embed.set_image(url=f"{url}?v={int(time.time())}")

        return embed

    async def on_timeout(self) -> None:
        for item in self.children:
            if isinstance(item, discord.ui.Button):
                item.disabled = True

        try:
            if self.message:
                await self.message.edit(view=self)
        except (discord.NotFound, discord.HTTPException):
            pass


class MediaButton(discord.ui.Button):
    """Dynamic component button managing media state swaps gracefully."""

    def __init__(self, view: BaseMediaView, media_type: str, label: str,
                 style: discord.ButtonStyle):
        super().__init__(label=label,
                         style=style,
                         disabled=(view.active == media_type))
        self._view_ref = view
        self.media_type = media_type

    async def callback(self, interaction: discord.Interaction):
        view = self._view_ref

        if view.active == self.media_type:
            await interaction.response.defer()
            return

        view.active = self.media_type
        view._sync_buttons()

        await interaction.response.edit_message(embed=view.build_embed(),
                                                view=view)
