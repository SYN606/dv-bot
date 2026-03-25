import discord
from discord.ext import commands
from discord import app_commands

from utils.permissions.base_admin import BaseAdminCog
from utils.core.embeds import make_embed
from utils.core.emojis import EMOJIS
from utils.logging.mod_log import send_mod_log

from db.db_helpers.sticky import (
    set_sticky,
    remove_sticky,
    get_sticky,
    update_last_message,  # ⚠️ make sure this exists
)

# IMPORT CENTRAL STICKY ENGINE
from utils.handlers.sticky.sticky_handler import StickyPayload, process_sticky


class Sticky(BaseAdminCog):

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    # ─────────────────────────
    # SET STICKY
    # ─────────────────────────
    @app_commands.command(name="sticky_set")
    async def sticky_set(
        self,
        interaction: discord.Interaction,
        channel: discord.TextChannel,
        message: str,
    ):
        guild = interaction.guild
        if guild is None:
            return await interaction.response.send_message(
                embed=make_embed(
                    title="Invalid Context",
                    description="This command must be used in a server.",
                    level="ERROR",
                ),
                ephemeral=True,
            )

        if not message.strip():
            return await interaction.response.send_message(
                embed=make_embed(
                    title="Invalid Message",
                    description="Sticky message cannot be empty.",
                    level="WARNING",
                ),
                ephemeral=True,
            )

        await interaction.response.defer(ephemeral=True)

        # Save config
        await set_sticky(guild.id, channel.id, message)

        # Create sticky instantly using engine
        payload = StickyPayload(
            content=message,
            message_id=None,
        )

        new_id = await process_sticky(channel, payload, cooldown=0)

        if new_id:
            await update_last_message(guild.id, channel.id, new_id)

        await interaction.followup.send(
            embed=make_embed(
                title="Sticky Enabled",
                description=f"{EMOJIS['success']} Sticky enabled in {channel.mention}.",
                level="SUCCESS",
            ),
            ephemeral=True,
        )

        await send_mod_log(
            guild=guild,
            category="CONFIG",
            title="Sticky Enabled",
            description=f"Sticky enabled in {channel.mention}.",
            level="SUCCESS",
            actor=interaction.user,
            extra_fields={"Channel ID": channel.id},
        )

    # ─────────────────────────
    # DISABLE STICKY
    # ─────────────────────────
    @app_commands.command(name="sticky_disable")
    async def sticky_disable(
        self,
        interaction: discord.Interaction,
        channel: discord.TextChannel,
    ):
        guild = interaction.guild
        if guild is None:
            return

        await interaction.response.defer(ephemeral=True)

        content = await get_sticky(guild.id, channel.id)
        removed = await remove_sticky(guild.id, channel.id)

        # Delete existing sticky message
        if removed:
            try:
                async for msg in channel.history(limit=10):
                    if msg.author == interaction.client.user:
                        await msg.delete()
                        break
            except Exception:
                pass

        await interaction.followup.send(
            embed=make_embed(
                title="Sticky Updated",
                description=(
                    f"{EMOJIS['success']} Sticky disabled in {channel.mention}."
                    if removed else
                    f"{EMOJIS['warning']} No sticky configured."
                ),
                level="SUCCESS" if removed else "WARNING",
            ),
            ephemeral=True,
        )

        if removed:
            await send_mod_log(
                guild=guild,
                category="CONFIG",
                title="Sticky Disabled",
                description=f"Sticky disabled in {channel.mention}.",
                level="INFO",
                actor=interaction.user,
                extra_fields={"Channel ID": channel.id},
            )

    # ─────────────────────────
    # STATUS
    # ─────────────────────────
    @app_commands.command(name="sticky_status")
    async def sticky_status(
        self,
        interaction: discord.Interaction,
        channel: discord.TextChannel,
    ):
        guild = interaction.guild
        if guild is None:
            return

        await interaction.response.defer(ephemeral=True)

        content = await get_sticky(guild.id, channel.id)

        await interaction.followup.send(
            embed=make_embed(
                title="Sticky Status",
                description=(
                    f"{EMOJIS['green_dot']} Enabled in {channel.mention}\n\n{content}"
                    if content else
                    f"{EMOJIS['red_dot']} Sticky not enabled in {channel.mention}."
                ),
                level="INFO",
            ),
            ephemeral=True,
        )


async def setup(bot: commands.Bot):
    await bot.add_cog(Sticky(bot))