import discord
from utils.embeds import make_embed


class BannerView(discord.ui.View):
    """
    v3 Banner View

    - Toggle server/global banner
    - Interaction-locked
    - Safe editing
    - Clean timeout
    """

    def __init__(
        self,
        *,
        requester_id: int,
        global_url: str | None,
        server_url: str | None,
        active: str = "server",
    ):
        super().__init__(timeout=60)

        self.requester_id = requester_id
        self.global_url = global_url
        self.server_url = server_url
        self.active = active
        self.message: discord.Message | None = None

        self._sync_buttons()

    def _sync_buttons(self) -> None:
        self.clear_items()

        if self.server_url:
            self.add_item(ServerBannerButton(disabled=self.active == "server"))

        if self.global_url:
            self.add_item(GlobalBannerButton(disabled=self.active == "global"))

    async def interaction_check(
        self,
        interaction: discord.Interaction,
    ) -> bool:
        return interaction.user.id == self.requester_id

    def build_embed(self) -> discord.Embed:
        embed = make_embed(
            title="User Banner",
            description="Switch between available banners.",
            level="INFO",
            footer=("Showing server banner"
                    if self.active == "server" else "Showing global banner"),
        )

        embed.set_image(url=self.server_url if self.active ==
                        "server" else self.global_url)

        return embed

    async def on_timeout(self) -> None:
        for item in self.children:
            item.disabled = True

        try:
            if self.message:
                await self.message.edit(view=self)
        except (discord.NotFound, discord.HTTPException):
            pass


class ServerBannerButton(discord.ui.Button):

    def __init__(self, *, disabled: bool):
        super().__init__(
            label="Server Banner",
            style=discord.ButtonStyle.primary,
            disabled=disabled,
        )

    async def callback(self, interaction: discord.Interaction):
        view: BannerView = self.view  # type: ignore

        view.active = "server"
        view._sync_buttons()

        if interaction.response.is_done():
            await interaction.edit_original_response(
                embed=view.build_embed(),
                view=view,
            )
        else:
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

        view.active = "global"
        view._sync_buttons()

        if interaction.response.is_done():
            await interaction.edit_original_response(
                embed=view.build_embed(),
                view=view,
            )
        else:
            await interaction.response.edit_message(
                embed=view.build_embed(),
                view=view,
            )
