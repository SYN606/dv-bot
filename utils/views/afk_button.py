from __future__ import annotations

import logging
from typing import Optional

import discord

from db.db_helpers.afk import set_afk
from utils.core.embeds import make_embed
from utils.core.emojis import EMOJIS

logger = logging.getLogger("DigitalVigital")


class GlobalAFKView(discord.ui.View):
    """View attached to the AFK confirmation message allowing users to toggle between Local and Global AFK for 5 seconds."""

    def __init__(
            self,
            author_id: int,
            guild_id: int,
            afk_reason: str,
            timeout: float = 5.0,  # 5-second interactive window
    ):
        super().__init__(timeout=timeout)
        self.author_id = author_id
        self.guild_id = guild_id
        self.afk_reason = afk_reason
        self.is_global = False  # Starts as Local AFK
        self.message: Optional[discord.Message] = None

    @discord.ui.button(label="Make Global AFK",
                       style=discord.ButtonStyle.primary,
                       custom_id="afk_toggle_global",
                       emoji="🌐")
    async def toggle_global_button(self, interaction: discord.Interaction,
                                   button: discord.ui.Button) -> None:
        if interaction.user.id != self.author_id:
            await interaction.response.send_message(
                "You cannot modify someone else's AFK status.", ephemeral=True)
            return

        # Defer immediately to prevent 10062 Unknown Interaction timeouts during DB queries
        await interaction.response.defer()

        target_global = not self.is_global

        try:
            await set_afk(
                guild_id=self.guild_id,
                user_id=self.author_id,
                reason=self.afk_reason,
                is_global=target_global,
            )
            self.is_global = target_global
        except Exception as exc:
            logger.error("Failed to toggle AFK state for user %s: %s",
                         self.author_id, exc)
            await interaction.followup.send(
                "Failed to update AFK status. Please try again.",
                ephemeral=True,
            )
            return

        # Update button appearance based on state
        if self.is_global:
            button.label = "Make Local AFK"
            button.style = discord.ButtonStyle.secondary
            embed_title = "Global AFK Enabled"
            desc = (
                f"{EMOJIS.get('okay', '👌')} {interaction.user.mention} is now marked **Global AFK** across all servers.\n"
                f"{EMOJIS.get('arrow_point', '➡️')} Reason: {self.afk_reason}")
        else:
            button.label = "Make Global AFK"
            button.style = discord.ButtonStyle.primary
            guild_name = interaction.guild.name if interaction.guild else "this server"
            embed_title = "Local AFK Enabled"
            desc = (
                f"{EMOJIS.get('okay', '👌')} {interaction.user.mention} is now AFK in **{guild_name}**.\n"
                f"{EMOJIS.get('arrow_point', '➡️')} Reason: {self.afk_reason}")

        embed = make_embed(
            title=embed_title,
            description=desc,
            level="SUCCESS",
        )
        embed.set_footer(
            text=f"Action by : {interaction.user}",
            icon_url=interaction.user.display_avatar.url,
        )

        # Edit original message after deferral
        assert interaction.message is not None
        await interaction.followup.edit_message(
            message_id=interaction.message.id,
            embed=embed,
            view=self,
        )

    async def on_timeout(self) -> None:
        """Disable button after 5 seconds and lock final state in the UI."""
        for child in self.children:
            if isinstance(child, discord.ui.Button):
                child.disabled = True
                if self.is_global:
                    child.label = "Global AFK Active"
                    child.style = discord.ButtonStyle.success
                else:
                    child.label = "Local AFK Active"
                    child.style = discord.ButtonStyle.secondary

        if self.message:
            try:
                await self.message.edit(view=self)
            except (discord.NotFound, discord.HTTPException):
                pass
