import time
import discord
from utils.core.embeds import make_embed
from utils.core.emojis import EMOJIS


class BaseMediaView(discord.ui.View):
    """
    Reusable media switcher for Avatar / Banner / Icon etc.
    """

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

    # ─────────────────────────────
    # Button Sync
    # ─────────────────────────────
    def _sync_buttons(self) -> None:

        self.clear_items()

        if self.server_url:
            self.add_item(ServerMediaButton(self))

        if self.global_url:
            self.add_item(GlobalMediaButton(self))

    # ─────────────────────────────
    # Interaction Security
    # ─────────────────────────────
    async def interaction_check(
        self,
        interaction: discord.Interaction,
    ) -> bool:

        if interaction.user.id != self.requester_id:

            await interaction.response.send_message(
                embed=make_embed(
                    title="Unauthorized",
                    description=f"{EMOJIS['fail']} You cannot use this interaction.",
                    level="ERROR",
                ),
                ephemeral=True,
            )

            return False

        return True

    # ─────────────────────────────
    # Embed Builder
    # ─────────────────────────────
    def build_embed(self) -> discord.Embed:

        if self.active == "server":
            url = self.server_url
            state = self.server_label
        else:
            url = self.global_url
            state = self.global_label

        embed = make_embed(
            title=self.title,
            description=f"Switch between available {self.title.lower()}.",
            level="INFO",
            footer=f"{state} • Requested by {self.requester_name}",
        )

        if url:
            # cache buster prevents Discord CDN caching issue
            embed.set_image(url=f"{url}?v={int(time.time())}")

        return embed

    # ─────────────────────────────
    # Timeout
    # ─────────────────────────────
    async def on_timeout(self):

        for item in self.children:
            item.disabled = True # type: ignore

        try:
            if self.message:
                await self.message.edit(view=self)
        except (discord.NotFound, discord.HTTPException):
            pass


# ─────────────────────────────
# BUTTONS
# ─────────────────────────────
class ServerMediaButton(discord.ui.Button):

    def __init__(self, view: BaseMediaView):
        super().__init__(
            label=view.server_label,
            style=discord.ButtonStyle.primary,
            disabled=view.active == "server",
        )
        self._view_ref = view

    async def callback(self, interaction: discord.Interaction):

        view = self._view_ref

        if view.active == "server":
            await interaction.response.defer()
            return

        view.active = "server"
        view._sync_buttons()

        await interaction.response.edit_message(
            embed=view.build_embed(),
            view=view,
        )


class GlobalMediaButton(discord.ui.Button):

    def __init__(self, view: BaseMediaView):
        super().__init__(
            label=view.global_label,
            style=discord.ButtonStyle.secondary,
            disabled=view.active == "global",
        )
        self._view_ref = view

    async def callback(self, interaction: discord.Interaction):

        view = self._view_ref

        if view.active == "global":
            await interaction.response.defer()
            return

        view.active = "global"
        view._sync_buttons()

        await interaction.response.edit_message(
            embed=view.build_embed(),
            view=view,
        )