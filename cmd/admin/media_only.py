import discord
from discord import app_commands
from discord.ext import commands
from utils.permissions.base_admin import BaseAdminCog
from utils.core.embeds import make_embed
from utils.core.emojis import EMOJIS
from utils.views.media_only_views import MediaOnlyView
from utils.logging.mod_log import send_mod_log


class MediaOnly(BaseAdminCog):

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    async def _reply(self,
                     interaction: discord.Interaction,
                     *,
                     title: str,
                     description: str,
                     level: str = "ERROR") -> None:
        embed = make_embed(title=title, description=description, level=level)
        try:
            send_method = interaction.followup.send if interaction.response.is_done(
            ) else interaction.response.send_message
            await send_method(embed=embed, ephemeral=True)
        except discord.HTTPException:
            pass

    @app_commands.command(name="media_only",
                          description="Manage media-only mode for a channel")
    @app_commands.describe(
        channel="Channel to manage (defaults to current channel)")
    async def media_only(self,
                         interaction: discord.Interaction,
                         channel: discord.TextChannel | None = None) -> None:
        guild = interaction.guild
        actor = interaction.user

        if not guild or not isinstance(actor, discord.Member):
            return await self._reply(
                interaction,
                title="Invalid Context",
                description="This command can only be used in a server.")

        target_channel = channel or interaction.channel
        if not isinstance(target_channel, discord.TextChannel):
            return await self._reply(
                interaction,
                title="Invalid Channel",
                description="Please select a valid text channel.")

        bot_member = guild.me
        if not bot_member:
            return

        perms = target_channel.permissions_for(bot_member)
        reqs = {
            "Manage Channels": perms.manage_channels,
            "Manage Messages": perms.manage_messages,
            "Read Message History": perms.read_message_history
        }
        missing = [name for name, present in reqs.items() if not present]

        if missing:
            return await self._reply(interaction,
                                     title="Missing Permissions",
                                     description=f"I am missing:\n\n" +
                                     "\n".join(f"• `{p}`" for p in missing) +
                                     f"\n\nin {target_channel.mention}.")

        view = MediaOnlyView(guild_id=guild.id,
                             channel=target_channel,
                             actor_id=actor.id)
        embed = make_embed(
            title="Media-Only Channel Control",
            description=
            (f"{EMOJIS['announcement']} Manage **media-only mode** for {target_channel.mention}.\n\n"
             f"{EMOJIS['green_dot']} Enable restrictions\n{EMOJIS['red_dot']} Disable restrictions\n"
             f"{EMOJIS['ping']} Check current status\n\n{EMOJIS['okay']} This panel is visible only to you."
             ),
            level="SYSTEM",
            footer=f"Channel • #{target_channel.name}")

        try:
            if interaction.response.is_done():
                message = await interaction.followup.send(embed=embed,
                                                          view=view,
                                                          ephemeral=True,
                                                          wait=True)
            else:
                await interaction.response.send_message(embed=embed,
                                                        view=view,
                                                        ephemeral=True)
                message = await interaction.original_response()
            view.message = message
        except discord.HTTPException:
            return await self._reply(
                interaction,
                title="Panel Error",
                description="Failed to create the media-only control panel.")

        try:
            await send_mod_log(
                guild=guild,
                category="CONFIG",
                title="Media-Only Panel Opened",
                description=
                f"Media-only control opened for {target_channel.mention}.",
                level="INFO",
                actor=actor,
                extra_fields={"Channel ID": target_channel.id})
        except Exception:
            pass


setattr(MediaOnly.media_only, "config_command", True)


async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(MediaOnly(bot))
