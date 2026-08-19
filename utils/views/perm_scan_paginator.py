from __future__ import annotations

import discord

from utils.core.embeds import make_embed
from utils.core.emojis import EMOJIS


class PermScanPaginator(discord.ui.View):
    """Paginator view using UI buttons for navigating permission scan results."""

    def __init__(
        self,
        results: list[tuple[int, int, str]],
        author: discord.User | discord.Member,
        per_page: int = 15,
        timeout: float = 180.0,
    ) -> None:
        super().__init__(timeout=timeout)
        self.results = results
        self.author = author
        self.per_page = per_page
        self.current_page = 0
        self.total_pages = max(1, (len(results) + per_page - 1) // per_page)
        self._update_button_states()

    def _update_button_states(self) -> None:
        self.btn_first.disabled = self.current_page == 0
        self.btn_prev.disabled = self.current_page == 0
        self.btn_next.disabled = self.current_page >= self.total_pages - 1
        self.btn_last.disabled = self.current_page >= self.total_pages - 1

    def create_embed(self) -> discord.Embed:
        red_dot = EMOJIS.get("red_dot", "🔴")
        warning = EMOJIS.get("warning", "⚠️")
        shield = EMOJIS.get("shield", "🛡️")

        start_idx = self.current_page * self.per_page
        end_idx = start_idx + self.per_page
        page_items = self.results[start_idx:end_idx]

        lines = [
            f"`{i + 1:02d}.` **{r[2]}** | {red_dot} `{r[0]}` {warning} `{r[1]}`"
            for i, r in enumerate(page_items, start=start_idx)
        ]

        desc = "\n".join(
            lines) if lines else "No members with elevated permissions found."

        return make_embed(
            title=f"{shield} Permission Scan Summary",
            description=desc,
            level="WARNING",
            footer=
            f"Page {self.current_page + 1} of {self.total_pages} • Total: {len(self.results)} members",
        )

    async def interaction_check(self,
                                interaction: discord.Interaction) -> bool:
        if interaction.user.id != self.author.id:
            await interaction.response.send_message(
                embed=make_embed(
                    title="Control Restricted",
                    description=
                    "You cannot operate the pagination controls for another user's scan command.",
                    level="ERROR",
                ),
                ephemeral=True,
            )
            return False
        return True

    @discord.ui.button(label="≪", style=discord.ButtonStyle.secondary)
    async def btn_first(self, interaction: discord.Interaction,
                        button: discord.ui.Button) -> None:
        self.current_page = 0
        self._update_button_states()
        await interaction.response.edit_message(embed=self.create_embed(),
                                                view=self)

    @discord.ui.button(label="‹", style=discord.ButtonStyle.primary)
    async def btn_prev(self, interaction: discord.Interaction,
                       button: discord.ui.Button) -> None:
        self.current_page -= 1
        self._update_button_states()
        await interaction.response.edit_message(embed=self.create_embed(),
                                                view=self)

    @discord.ui.button(label="›", style=discord.ButtonStyle.primary)
    async def btn_next(self, interaction: discord.Interaction,
                       button: discord.ui.Button) -> None:
        self.current_page += 1
        self._update_button_states()
        await interaction.response.edit_message(embed=self.create_embed(),
                                                view=self)

    @discord.ui.button(label="≫", style=discord.ButtonStyle.secondary)
    async def btn_last(self, interaction: discord.Interaction,
                       button: discord.ui.Button) -> None:
        self.current_page = self.total_pages - 1
        self._update_button_states()
        await interaction.response.edit_message(embed=self.create_embed(),
                                                view=self)

    async def on_timeout(self) -> None:
        for child in self.children:
            if isinstance(child, discord.ui.Button):
                child.disabled = True
