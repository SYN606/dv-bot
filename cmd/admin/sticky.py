import discord
from discord import app_commands
from discord.ext import commands
from utils.permissions.base_admin import (BaseAdminCog)
from utils.core.embeds import make_embed
from utils.core.emojis import EMOJIS
from utils.logging.mod_log import (send_mod_log)
from db.db_helpers.sticky import (get_sticky, remove_sticky, set_sticky,
                                  update_last_message)
from utils.handlers.sticky.sticky_handler import (StickyPayload,
                                                  process_sticky)


class Sticky(BaseAdminCog):

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    # Set sticky
    @app_commands.command(name="sticky_set",
                          description="Enable sticky messages in a channel.")
    @app_commands.describe(channel="Channel where sticky should be enabled",
                           message="Sticky message content")
    async def sticky_set(self, interaction: discord.Interaction,
                         channel: discord.TextChannel, message: str) -> None:
        guild = interaction.guild
        actor = interaction.user
        if guild is None:
            await interaction.response.send_message(embed=make_embed(
                title="Invalid Context",
                description=("This command must be used in a server."),
                level="ERROR"),
                                                    ephemeral=True)
            return
        if not message.strip():
            await interaction.response.send_message(embed=make_embed(
                title="Invalid Message",
                description=("Sticky message cannot be empty."),
                level="WARNING"),
                                                    ephemeral=True)
            return
        # Bot permissions
        bot_member = guild.me
        if bot_member:
            perms = channel.permissions_for(bot_member, )
            if not perms.send_messages:
                await interaction.response.send_message(embed=make_embed(
                    title="Missing Permissions",
                    description=(
                        f"I cannot send messages in {channel.mention}."),
                    level="ERROR"),
                                                        ephemeral=True)
                return
        await interaction.response.defer(ephemeral=True, )
        # Save sticky
        await set_sticky(guild.id, channel.id, message)
        # Send instantly
        payload = StickyPayload(content=message, message_id=None)
        new_id = await process_sticky(channel, payload, cooldown=0)

        if new_id:
            await update_last_message(guild.id, channel.id, new_id)

        await interaction.followup.send(embed=make_embed(
            title="Sticky Enabled",
            description=(
                f"{EMOJIS['success']} Sticky enabled in {channel.mention}."),
            level="SUCCESS",
        ),
                                        ephemeral=True)

        # Logging
        try:
            await send_mod_log(
                guild=guild,
                category="CONFIG",
                title="Sticky Enabled",
                description=(f"Sticky enabled in {channel.mention}."),
                level="SUCCESS",
                actor=actor,
                extra_fields={"Channel ID": channel.id})

        except Exception:
            pass

    # Disable sticky
    @app_commands.command(name="sticky_disable",
                          description="Disable sticky messages in a channel.")
    @app_commands.describe(channel="Channel where sticky should be disabled")
    async def sticky_disable(self, interaction: discord.Interaction,
                             channel: discord.TextChannel) -> None:
        guild = interaction.guild
        actor = interaction.user
        if guild is None:
            return

        await interaction.response.defer(ephemeral=True)
        removed = await remove_sticky(guild.id, channel.id)

        # Remove recent sticky
        if removed:
            try:
                async for msg in channel.history(limit=20):
                    if msg.author == interaction.client.user:
                        await msg.delete()
                        break

            except Exception:
                pass

        await interaction.followup.send(embed=make_embed(
            title="Sticky Updated",
            description=(
                f"{EMOJIS['success']} Sticky disabled in {channel.mention}."
                if removed else f"{EMOJIS['warning']} No sticky configured."),
            level=("SUCCESS" if removed else "WARNING")),
                                        ephemeral=True)

        # Logging
        if removed:
            try:
                await send_mod_log(
                    guild=guild,
                    category="CONFIG",
                    title="Sticky Disabled",
                    description=(f"Sticky disabled in {channel.mention}."),
                    level="INFO",
                    actor=actor,
                    extra_fields={"Channel ID": channel.id})

            except Exception:
                pass

    # Sticky status
    @app_commands.command(
        name="sticky_status",
        description="View sticky message status in a channel.")
    @app_commands.describe(channel="Channel to check sticky status")
    async def sticky_status(self, interaction: discord.Interaction,
                            channel: discord.TextChannel) -> None:

        guild = interaction.guild
        if guild is None:
            return
        await interaction.response.defer(ephemeral=True)
        content = await get_sticky(guild.id, channel.id)
        await interaction.followup.send(embed=make_embed(
            title="Sticky Status",
            description=
            (f"{EMOJIS['green_dot']} Enabled in {channel.mention}\n\n{content}"
             if content else
             f"{EMOJIS['red_dot']} Sticky not enabled in {channel.mention}."),
            level="INFO"),
                                        ephemeral=True)


async def setup(bot: commands.Bot):
    await bot.add_cog(Sticky(bot))
