from __future__ import annotations

import logging
import discord
from discord import ui

from db.db_helpers.sticky import set_sticky, update_last_message
from utils.core.embeds import make_embed
from utils.core.emojis import EMOJIS
from utils.handlers.sticky._sticky_manager import StickyPayload, process_sticky
from utils.logging.mod_log import send_mod_log

logger = logging.getLogger("bot")


class StickyModal(ui.Modal, title="Configure Multi-Line Sticky"):

    def __init__(self, target_channel: discord.TextChannel) -> None:
        super().__init__()
        self.target_channel = target_channel

        self.sticky_content = ui.TextInput(
            label="Sticky Message Content",
            style=discord.TextStyle.
            paragraph,  # Enables the large multi-line box
            placeholder=
            "Enter your multi-line message...\nMarkdown, links, and line breaks are supported.",
            required=True,
            min_length=1,
            max_length=2000)
        self.add_item(self.sticky_content)

    async def on_submit(self, interaction: discord.Interaction) -> None:
        guild = interaction.guild
        if guild is None:
            return

        # Defer because database operations and webhook sending take time
        await interaction.response.defer(ephemeral=True)
        message_text = self.sticky_content.value.strip()

        # Update database with the multi-line content
        await set_sticky(guild.id, self.target_channel.id, message_text)

        # Post the sticky via webhook manager
        payload = StickyPayload(content=message_text, message_id=None)
        new_id = await process_sticky(self.target_channel, payload, force=True)

        if new_id:
            await update_last_message(guild.id, self.target_channel.id, new_id)

        success_emoji = EMOJIS.get("success") or "✅"
        await interaction.followup.send(embed=make_embed(
            title="Sticky Enabled",
            description=
            (f"{success_emoji} Multi-line sticky message is now active inside "
             f"{self.target_channel.mention}."),
            level="SUCCESS",
            footer=f"Action by {interaction.user}"))

        # Log to mod logs
        try:
            await send_mod_log(
                guild=guild,
                category="CONFIG",
                title="Sticky Configured",
                description=
                f"Multi-line sticky configured inside {self.target_channel.mention}.",
                level="SUCCESS",
                actor=interaction.user,
                extra_fields={"Channel ID": self.target_channel.id},
            )
        except Exception:
            logger.exception("Failed to send sticky setup moderation log")
