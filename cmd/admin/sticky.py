from __future__ import annotations

import logging
import discord
from discord import app_commands
from discord.ext import commands

from db.db_helpers.sticky import (get_sticky, remove_sticky, set_sticky,
                                  update_last_message)
from utils.core.embeds import make_embed
from utils.core.emojis import EMOJIS
from utils.handlers.sticky.sticky_manager import StickyPayload, process_sticky
from utils.handlers.sticky.webhook_utils import remove_sticky_webhook
from utils.logging.mod_log import send_mod_log
from utils.permissions.base_admin import BaseAdminCog
from utils.views.sticky_modal import StickyModal

logger = logging.getLogger("bot")


@app_commands.guild_only()
@app_commands.default_permissions(manage_channels=True)
class Sticky(BaseAdminCog, name="sticky_cog"):
    """Cog responsible for managing persistent automated sticky messages in text channels."""

    def __init__(self, bot: commands.Bot) -> None:
        self.bot = bot

    def _has_privileges(self, interaction: discord.Interaction) -> bool:
        guild = interaction.guild
        actor = interaction.user

        if guild is None or not isinstance(actor, discord.Member):
            return False

        return (actor.id == guild.owner_id
                or actor.guild_permissions.administrator
                or actor.guild_permissions.manage_channels)

    def _resolve_target_channel(
            self, interaction: discord.Interaction,
            channel: discord.TextChannel | None) -> discord.TextChannel | None:
        """Helper to safely narrow the target channel to a standard discord.TextChannel."""
        target = channel or interaction.channel
        if isinstance(target, discord.TextChannel):
            return target
        return None

    def _check_bot_permissions(self,
                               channel: discord.TextChannel) -> str | None:
        """Utility to check if bot has required channel permissions."""
        if channel.guild.me is None:
            return "Bot member context could not be resolved."

        perms = channel.permissions_for(channel.guild.me)
        if not (perms.send_messages and perms.manage_webhooks
                and perms.manage_messages):
            return (
                f"I require `Send Messages`, `Manage Messages`, and `Manage Webhooks` "
                f"permissions in {channel.mention}.")
        return None

    sticky = app_commands.Group(
        name="sticky",
        description="Manage automated channel sticky message layouts.")

    @sticky.command(
        name="singleline",
        description="Set a single-line sticky message in a channel.")
    @app_commands.describe(
        message="The single-line sticky text or image URL",
        channel="The target channel (defaults to current channel)")
    async def sticky_singleline(
            self,
            interaction: discord.Interaction,
            message: str,
            channel: discord.TextChannel | None = None) -> None:
        guild = interaction.guild
        if guild is None:
            return

        if not self._has_privileges(interaction):
            await interaction.response.send_message(embed=make_embed(
                title="Permission Denied",
                description=
                "You require `Manage Channels` permissions to run this.",
                level="ERROR",
            ),
                                                    ephemeral=True)
            return

        target_channel = self._resolve_target_channel(interaction, channel)
        if target_channel is None:
            await interaction.response.send_message(embed=make_embed(
                title="Invalid Channel",
                description=
                "Sticky messages can only be deployed inside standard text channels.",
                level="ERROR"),
                                                    ephemeral=True)
            return

        perm_error = self._check_bot_permissions(target_channel)
        if perm_error:
            await interaction.response.send_message(embed=make_embed(
                title="Missing Permissions",
                description=perm_error,
                level="ERROR",
            ),
                                                    ephemeral=True)
            return

        if not message.strip():
            await interaction.response.send_message(embed=make_embed(
                title="Empty Content",
                description="Your sticky message cannot be empty.",
                level="WARNING"),
                                                    ephemeral=True)
            return

        await interaction.response.defer(ephemeral=True)

        await set_sticky(guild.id, target_channel.id, message.strip())

        payload = StickyPayload(content=message.strip(), message_id=None)
        new_id = await process_sticky(target_channel, payload, force=True)

        if new_id:
            await update_last_message(guild.id, target_channel.id, new_id)

        success_emoji = EMOJIS.get("success") or "✅"
        await interaction.followup.send(embed=make_embed(
            title="Sticky Enabled",
            description=(
                f"{success_emoji} Single-line sticky message is active inside "
                f"{target_channel.mention}."),
            level="SUCCESS",
            footer=f"Action by {interaction.user}"))

        try:
            await send_mod_log(
                guild=guild,
                category="CONFIG",
                title="Sticky Configured",
                description=
                f"Single-line sticky configured inside {target_channel.mention}.",
                level="SUCCESS",
                actor=interaction.user,
                extra_fields={"Channel ID": str(target_channel.id)})
        except Exception:
            logger.exception("Failed to send sticky setup moderation log")

    @sticky.command(
        name="multiline",
        description="Opens a pop-up modal to input a multi-line sticky message."
    )
    @app_commands.describe(
        channel="The target channel (defaults to current channel)")
    async def sticky_multiline(
            self,
            interaction: discord.Interaction,
            channel: discord.TextChannel | None = None) -> None:
        if interaction.guild is None:
            return

        if not self._has_privileges(interaction):
            await interaction.response.send_message(embed=make_embed(
                title="Permission Denied",
                description=
                "You require `Manage Channels` permissions to run this.",
                level="ERROR"),
                                                    ephemeral=True)
            return

        target_channel = self._resolve_target_channel(interaction, channel)
        if target_channel is None:
            await interaction.response.send_message(embed=make_embed(
                title="Invalid Channel",
                description=
                "Sticky messages can only be deployed inside standard text channels.",
                level="ERROR"),
                                                    ephemeral=True)
            return

        perm_error = self._check_bot_permissions(target_channel)
        if perm_error:
            await interaction.response.send_message(embed=make_embed(
                title="Missing Permissions",
                description=perm_error,
                level="ERROR"),
                                                    ephemeral=True)
            return

        await interaction.response.send_modal(
            StickyModal(target_channel=target_channel))

    @sticky.command(
        name="disable",
        description=
        "Turn off sticky message processing for a channel and remove its webhook."
    )
    @app_commands.describe(
        channel="The channel to clear stickies from (defaults to current)")
    async def sticky_disable(
            self,
            interaction: discord.Interaction,
            channel: discord.TextChannel | None = None) -> None:
        guild = interaction.guild
        if guild is None:
            return

        if not self._has_privileges(interaction):
            await interaction.response.send_message(embed=make_embed(
                title="Permission Denied",
                description=
                "You require `Manage Channels` permissions to run this.",
                level="ERROR"),
                                                    ephemeral=True)
            return

        target_channel = self._resolve_target_channel(interaction, channel)
        if target_channel is None:
            await interaction.response.send_message(embed=make_embed(
                title="Invalid Channel",
                description="Sticky systems do not manage non-text layouts.",
                level="ERROR"),
                                                    ephemeral=True)
            return

        await interaction.response.defer(ephemeral=True)
        removed = await remove_sticky(guild.id, target_channel.id)

        if removed:
            await remove_sticky_webhook(target_channel)

        success_emoji = EMOJIS.get("success") or "✅"
        warning_emoji = EMOJIS.get("warning") or "⚠️"

        status_description = (
            f"{success_emoji} Cleared active sticky properties and removed webhook from {target_channel.mention}."
            if removed else
            f"{warning_emoji} There are no active sticky profiles configured inside {target_channel.mention}."
        )

        await interaction.followup.send(
            embed=make_embed(title="Sticky Updated",
                             description=status_description,
                             level="SUCCESS" if removed else "WARNING",
                             footer=f"Action by {interaction.user}"))

    @sticky.command(
        name="status",
        description="Query current sticky message configurations for a channel."
    )
    @app_commands.describe(
        channel="The channel to inspect (defaults to current)")
    async def sticky_status(
            self,
            interaction: discord.Interaction,
            channel: discord.TextChannel | None = None) -> None:
        guild = interaction.guild
        if guild is None:
            return

        if not self._has_privileges(interaction):
            await interaction.response.send_message(embed=make_embed(
                title="Permission Denied",
                description=
                "You require `Manage Channels` permissions to run this.",
                level="ERROR"),
                                                    ephemeral=True)
            return

        target_channel = self._resolve_target_channel(interaction, channel)
        if target_channel is None:
            await interaction.response.send_message(embed=make_embed(
                title="Invalid Channel",
                description=
                "Sticky setups are restricted to server text channels.",
                level="ERROR"),
                                                    ephemeral=True)
            return

        await interaction.response.defer(ephemeral=True)
        content = await get_sticky(guild.id, target_channel.id)

        green_dot = EMOJIS.get("green_dot") or "🟢"
        red_dot = EMOJIS.get("red_dot") or "🔴"

        status_description = (
            f"{green_dot} **Active layout configuration inside** {target_channel.mention}:\n\n{content}"
            if content else
            f"{red_dot} No sticky attributes running inside {target_channel.mention}."
        )

        await interaction.followup.send(
            embed=make_embed(title="Sticky Status",
                             description=status_description,
                             level="INFO",
                             footer=f"Action by {interaction.user}"))


async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(Sticky(bot))
