import discord

from utils.embeds import make_embed
from utils.emojis import EMOJIS


class BannerView(discord.ui.View):
    """
    Secure Banner View

    • Toggle between server and global banner
    • Interaction locked to requester
    • Safe message editing
    • Clean timeout lifecycle
    """

    def __init__(
        self,
        *,
        requester_id: int,
        requester_name: str,
        global_url: str | None,
        server_url: str | None,
        active: str = "server",
    ):
        super().__init__(timeout=60)

        self.requester_id = requester_id
        self.requester_name = requester_name
        self.global_url = global_url
        self.server_url = server_url
        self.active = active
        self.message: discord.Message | None = None

        self._sync_buttons()

    # ─────────────────────────────
    # Button sync
    # ─────────────────────────────
    def _sync_buttons(self) -> None:

        self.clear_items()

        if self.server_url:
            self.add_item(ServerBannerButton(disabled=self.active == "server"))

        if self.global_url:
            self.add_item(GlobalBannerButton(disabled=self.active == "global"))

    # ─────────────────────────────
    # Interaction restriction
    # ─────────────────────────────
    async def interaction_check(
        self,
        interaction: discord.Interaction,
    ) -> bool:

        if interaction.user.id != self.requester_id:
            try:
                if not interaction.response.is_done():
                    await interaction.response.send_message(
                        embed=make_embed(
                            title="Unauthorized",
                            description=f"{EMOJIS['fail']} You cannot use this interaction.",
                            level="ERROR",
                        ),
                        ephemeral=True,
                    )
            except discord.NotFound:
                pass

            return False

        return True

    # ─────────────────────────────
    # Embed builder
    # ─────────────────────────────
    def build_embed(self) -> discord.Embed:

        if self.active == "server":
            url = self.server_url
            footer_text = "Showing server banner"
        else:
            url = self.global_url
            footer_text = "Showing global banner"

        embed = make_embed(
            title="User Banner",
            description="Switch between available banners.",
            level="INFO",
            footer=footer_text,
        )

        if url:
            embed.set_image(url=url)

        return embed

    # ─────────────────────────────
    # Timeout lifecycle
    # ─────────────────────────────
    async def on_timeout(self) -> None:

        for item in self.children:
            item.disabled = True  # type: ignore

        try:
            if self.message:
                await self.message.edit(view=self)
        except discord.NotFound, discord.HTTPException:
            pass


# ─────────────────────────────
# BUTTONS
# ─────────────────────────────
class ServerBannerButton(discord.ui.Button):
    def __init__(self, *, disabled: bool):
        super().__init__(
            label="Server Banner",
            style=discord.ButtonStyle.primary,
            disabled=disabled,
        )

    async def callback(self, interaction: discord.Interaction):

        view: BannerView = self.view  # type: ignore
        if not view:
            return

        view.active = "server"
        view._sync_buttons()

        await interaction.response.edit_message(
            embed=view.build_embed(),
            view=view,
        )


class GlobalBannerButton(discord.ui.Button):
    def __init__(self, *, disabled: bool):
        super().__init__(
            label="Global Banner",
            style=discord.ButtonStyle.secondary,
            disabled=disabled,
        )

    async def callback(self, interaction: discord.Interaction):

        view: BannerView = self.view  # type: ignore
        if not view:
            return

        view.active = "global"
        view._sync_buttons()

        await interaction.response.edit_message(
            embed=view.build_embed(),
            view=view,
        )
