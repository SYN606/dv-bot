import logging

import discord
from discord import app_commands
from discord.ext import commands

from db.db_helpers.sticky import (
    get_sticky,
    remove_sticky,
    set_sticky,
    update_last_message,
)
from utils.core.embeds import make_embed
from utils.core.emojis import EMOJIS
from utils.handlers.sticky.sticky_manager import StickyPayload, process_sticky
from utils.logging.mod_log import send_mod_log
from utils.permissions.base_admin import BaseAdminCog

logger = logging.getLogger("bot")


@app_commands.guild_only()
@app_commands.default_permissions(manage_channels=True)
class Sticky(BaseAdminCog, name="sticky_cog"):
    """Cog responsible for managing persistent automated sticky messages in text channels."""

    def __init__(self, bot: commands.Bot) -> None:
        self.bot = bot

    def _has_privileges(self, interaction: discord.Interaction) -> bool:
        """Validates that only Owner, Administrators, or Manage Channel staff can alter stickies."""
        guild = interaction.guild
        actor = interaction.user

        if guild is None or not isinstance(actor, discord.Member):
            return False

        is_owner = actor.id == guild.owner_id
        is_admin = actor.guild_permissions.administrator
        has_manage_channels = actor.guild_permissions.manage_channels

        return is_owner or is_admin or has_manage_channels

    sticky = app_commands.Group(
        name="sticky",
        description="Manage automated channel sticky message layouts.",
    )

    @sticky.command(
        name="set",
        description="Enable or update an embed sticky message in a channel.",
    )
    @app_commands.describe(
        message="The text content or image URL for your sticky layout",
        channel=
        "The target channel (defaults to the current channel if left empty)",
    )
    async def sticky_set(
        self,
        interaction: discord.Interaction,
        message: str,
        channel: discord.TextChannel | None = None,
    ) -> None:
        if not self._has_privileges(interaction):
            await interaction.response.send_message(
                embed=make_embed(
                    title="Permission Denied",
                    description=
                    ("You must be the Server Owner, an Administrator, or possess "
                     "`Manage Channels` permissions to run this."),
                    level="ERROR",
                ),
                ephemeral=True,
            )
            return

        target_channel = channel or interaction.channel
        if not isinstance(target_channel, discord.TextChannel):
            await interaction.response.send_message(
                embed=make_embed(
                    title="Invalid Channel",
                    description=
                    "Sticky messages can only be deployed inside standard server text channels.",
                    level="ERROR",
                ),
                ephemeral=True,
            )
            return

        guild = interaction.guild
        if guild is None:
            return

        if not message.strip():
            await interaction.response.send_message(
                embed=make_embed(
                    title="Empty Content",
                    description=
                    "Your sticky configuration message cannot be empty.",
                    level="WARNING",
                ),
                ephemeral=True,
            )
            return

        bot_member = guild.me
        if bot_member and not target_channel.permissions_for(
                bot_member).send_messages:
            await interaction.response.send_message(
                embed=make_embed(
                    title="Missing Permissions",
                    description=
                    f"I do not have permissions to send messages or embeds into {target_channel.mention}.",
                    level="ERROR",
                ),
                ephemeral=True,
            )
            return

        await interaction.response.defer(ephemeral=True)
        await set_sticky(guild.id, target_channel.id, message)

        payload = StickyPayload(content=message, message_id=None)
        new_id = await process_sticky(target_channel, payload, force=True)

        if new_id:
            await update_last_message(guild.id, target_channel.id, new_id)

        success_emoji = EMOJIS.get("success") or "✅"
        await interaction.followup.send(embed=make_embed(
            title="Sticky Enabled",
            description=
            (f"{success_emoji} Sticky embed configurations are now active inside "
             f"{target_channel.mention}."),
            level="SUCCESS",
            footer=f"Action by {interaction.user}",
        ))

        try:
            await send_mod_log(
                guild=guild,
                category="CONFIG",
                title="Sticky Configured",
                description=
                f"Sticky embed configured inside channel {target_channel.mention}.",
                level="SUCCESS",
                actor=interaction.user,
                extra_fields={"Channel ID": target_channel.id},
            )
        except Exception:
            logger.exception("Failed to send sticky setup moderation log")

    @sticky.command(
        name="disable",
        description="Turn off sticky message processing for a channel.",
    )
    @app_commands.describe(
        channel="The channel to clear stickies from (defaults to current)")
    async def sticky_disable(
        self,
        interaction: discord.Interaction,
        channel: discord.TextChannel | None = None,
    ) -> None:
        if not self._has_privileges(interaction):
            await interaction.response.send_message(
                embed=make_embed(
                    title="Permission Denied",
                    description=
                    ("You must be the Server Owner, an Administrator, or possess "
                     "`Manage Channels` permissions to run this."),
                    level="ERROR",
                ),
                ephemeral=True,
            )
            return

        target_channel = channel or interaction.channel
        if not isinstance(target_channel, discord.TextChannel):
            await interaction.response.send_message(
                embed=make_embed(
                    title="Invalid Channel",
                    description=
                    "Sticky systems do not manage non-text layouts.",
                    level="ERROR",
                ),
                ephemeral=True,
            )
            return

        guild = interaction.guild
        if guild is None:
            return

        await interaction.response.defer(ephemeral=True)
        removed = await remove_sticky(guild.id, target_channel.id)

        if removed:
            try:
                async for msg in target_channel.history(limit=20):
                    if msg.author == self.bot.user:
                        await msg.delete()
                        break
            except Exception:
                logger.exception(
                    "Failed to delete remaining sticky message on disable")

        success_emoji = EMOJIS.get("success") or "✅"
        warning_emoji = EMOJIS.get("warning") or "⚠️"

        status_description = (
            f"{success_emoji} Cleared active sticky properties from {target_channel.mention}."
            if removed else
            f"{warning_emoji} There are no active sticky profiles configured inside {target_channel.mention}."
        )

        await interaction.followup.send(embed=make_embed(
            title="Sticky Updated",
            description=status_description,
            level="SUCCESS" if removed else "WARNING",
            footer=f"Action by {interaction.user}",
        ))

    @sticky.command(
        name="status",
        description=
        "Query current sticky message configurations for a channel.",
    )
    @app_commands.describe(
        channel="The channel to inspect (defaults to current)")
    async def sticky_status(
        self,
        interaction: discord.Interaction,
        channel: discord.TextChannel | None = None,
    ) -> None:
        if not self._has_privileges(interaction):
            await interaction.response.send_message(
                embed=make_embed(
                    title="Permission Denied",
                    description=
                    ("You must be the Server Owner, an Administrator, or possess "
                     "`Manage Channels` permissions to run this."),
                    level="ERROR",
                ),
                ephemeral=True,
            )
            return

        target_channel = channel or interaction.channel
        if not isinstance(target_channel, discord.TextChannel):
            await interaction.response.send_message(
                embed=make_embed(
                    title="Invalid Channel",
                    description=
                    "Sticky setups are restricted to server text channels.",
                    level="ERROR",
                ),
                ephemeral=True,
            )
            return

        guild = interaction.guild
        if guild is None:
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

        await interaction.followup.send(embed=make_embed(
            title="Sticky Status",
            description=status_description,
            level="INFO",
            footer=f"Action by {interaction.user}",
        ))


async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(Sticky(bot))
