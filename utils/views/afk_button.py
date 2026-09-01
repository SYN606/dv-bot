from __future__ import annotations

import asyncio
import logging
import discord
from discord.ui import Button, View

from db.db_helpers.afk import set_afk
from utils.handlers.afk._afk_nicknames import apply_afk_nicknames

logger = logging.getLogger("DigitalVigital")


class GlobalAFKView(View):
    def __init__(
        self,
        guild_id: int,
        author_id: int,
        afk_reason: str,
        is_global: bool,
        timeout: float = 60.0,
    ):
        super().__init__(timeout=timeout)
        self.guild_id = guild_id
        self.author_id = author_id
        self.afk_reason = afk_reason
        self.is_global = is_global

        self.toggle_button = Button(
            label="Make Global" if not is_global else "Make Server Only",
            style=discord.ButtonStyle.secondary if not is_global else discord.ButtonStyle.primary,
            custom_id="afk_toggle_global",
        )
        self.toggle_button.callback = self.toggle_global_button
        self.add_item(self.toggle_button)

    async def interaction_check(self, interaction: discord.Interaction) -> bool:
        if interaction.user.id != self.author_id:
            await interaction.response.send_message(
                "You cannot modify someone else's AFK status.", ephemeral=True
            )
            return False
        return True

    async def toggle_global_button(self, interaction: discord.Interaction) -> None:
        await interaction.response.defer(ephemeral=True)

        target_global = not self.is_global
        try:
            await set_afk(
                guild_id=self.guild_id,
                user_id=self.author_id,
                reason=self.afk_reason,
                is_global=target_global,
            )
            self.is_global = target_global

            self.toggle_button.label = "Make Global" if not self.is_global else "Make Server Only"
            self.toggle_button.style = (
                discord.ButtonStyle.secondary if not self.is_global else discord.ButtonStyle.primary
            )
            await interaction.edit_original_response(view=self)

            if interaction.client and interaction.guild:
                asyncio.create_task(
                    apply_afk_nicknames(
                        bot=interaction.client,
                        user_id=self.author_id,
                        is_global=self.is_global,
                        current_guild=interaction.guild,
                    )
                )

            scope_text = "globally across all shared servers" if self.is_global else "only in this server"
            await interaction.followup.send(
                f"Your AFK status is now set **{scope_text}**.", ephemeral=True
            )

        except Exception as exc:
            logger.error("Failed to toggle global AFK for user %s: %s", self.author_id, exc)
            await interaction.followup.send(
                "An error occurred while updating your AFK scope.", ephemeral=True
            )