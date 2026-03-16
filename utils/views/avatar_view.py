import discord

from utils.embeds import make_embed
from utils.emojis import EMOJIS


class AvatarView(discord.ui.View):
    """
    Secure Avatar View

    • Toggle between server and global avatar
    • Single message editing
    • Locked to command requester
    • Safe timeout lifecycle
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

    # ─────────────────────────────
    # Sync buttons
    # ─────────────────────────────
    def _sync_buttons(self) -> None:

        self.clear_items()

        # show server button only if server avatar exists
        if self.server_url:
            self.add_item(ServerAvatarButton(disabled=self.active == "server"))

        # show global button only if global avatar exists
        if self.global_url:
            self.add_item(GlobalAvatarButton(disabled=self.active == "global"))

    # ─────────────────────────────
    # Restrict interaction
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

    def build_embed(self):

        if self.active == "server":
            url = self.server_url
            footer_text = "Showing server avatar"
        else:
            url = self.global_url
            footer_text = "Showing global avatar"

        embed = make_embed(
            title="User Avatar",
            description="Switch between available avatars.",
            level="INFO",
            footer=footer_text,
        )

        if url:
            embed.set_image(url=url)

        return embed

    # ─────────────────────────────
    # Timeout
    # ─────────────────────────────
    async def on_timeout(self) -> None:

        for item in self.children:
            item.disabled = True # type: ignore

        try:
            if self.message:
                await self.message.edit(view=self)
        except discord.NotFound, discord.HTTPException:
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

        if not view:
            return

        view.active = "server"
        view._sync_buttons()

        await interaction.response.edit_message(
            embed=view.build_embed(),
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

        if not view:
            return

        view.active = "global"
        view._sync_buttons()

        await interaction.response.edit_message(
            embed=view.build_embed(),
            view=view,
        )
