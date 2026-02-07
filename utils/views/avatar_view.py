import discord

from utils.embeds import make_embed


class AvatarView(discord.ui.View):
    """
    v2.3 Avatar View

    Allows switching between server and global avatars
    by updating the same message embed.
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

        self._sync_buttons()

    # ─────────────────────────────
    # Button setup
    # ─────────────────────────────
    def _sync_buttons(self) -> None:
        self.clear_items()

        if self.server_url:
            self.add_item(ServerAvatarButton(disabled=self.active == "server"))

        if self.global_url:
            self.add_item(GlobalAvatarButton(disabled=self.active == "global"))

    # ─────────────────────────────
    # Interaction guard
    # ─────────────────────────────
    async def interaction_check(
        self,
        interaction: discord.Interaction,
    ) -> bool:
        return interaction.user.id == self.requester_id

    # ─────────────────────────────
    # Embed builder
    # ─────────────────────────────
    def _build_embed(self) -> discord.Embed:
        embed = make_embed(
            title="User Avatar",
            description="Switch between available avatars.",
            level="INFO",
            footer=("Showing server avatar"
                    if self.active == "server" else "Showing global avatar"),
        )

        embed.set_image(url=self.server_url if self.active ==
                        "server" else self.global_url)

        return embed

    # ─────────────────────────────
    # Timeout handling
    # ─────────────────────────────
    async def on_timeout(self) -> None:
        for item in self.children:
            item.disabled = True

        try:
            await self.message.edit(view=self)
        except discord.NotFound:
            pass


class ServerAvatarButton(discord.ui.Button):

    def __init__(self, *, disabled: bool):
        super().__init__(
            label="Server Avatar",
            style=discord.ButtonStyle.primary,
            disabled=disabled,
        )

    async def callback(self, interaction: discord.Interaction):
        view: AvatarView = self.view  # type: ignore

        view.active = "server"
        view._sync_buttons()

        await interaction.response.edit_message(
            embed=view._build_embed(),
            view=view,
        )


class GlobalAvatarButton(discord.ui.Button):

    def __init__(self, *, disabled: bool):
        super().__init__(
            label="Global Avatar",
            style=discord.ButtonStyle.secondary,
            disabled=disabled,
        )

    async def callback(self, interaction: discord.Interaction):
        view: AvatarView = self.view  # type: ignore

        view.active = "global"
        view._sync_buttons()

        await interaction.response.edit_message(
            embed=view._build_embed(),
            view=view,
        )
