import discord
from discord import app_commands
from discord.ext import commands
from utils.permissions.base_admin import (
    BaseAdminCog, )
from utils.core.embeds import make_embed
from utils.core.emojis import EMOJIS
from utils.views.media_only_views import (
    MediaOnlyView, )
from utils.logging.mod_log import (
    send_mod_log, )


class MediaOnly(
        BaseAdminCog, ):

    def __init__(
        self,
        bot: commands.Bot,
    ):
        self.bot = bot

    async def _reply(
        self,
        interaction: discord.Interaction,
        *,
        title: str,
        description: str,
        level: str = "ERROR",
    ) -> None:
        embed = make_embed(
            title=title,
            description=description,
            level=level,
        )
        try:
            if interaction.response.is_done():

                await interaction.followup.send(
                    embed=embed,
                    ephemeral=True,
                )
            else:
                await interaction.response.send_message(
                    embed=embed,
                    ephemeral=True,
                )

        except discord.HTTPException:
            pass

    @app_commands.command(
        name="media_only",
        description=("Manage media-only "
                     "mode for a channel"),
    )
    @app_commands.describe(channel=("Channel to manage "
                                    "(defaults to current channel)"), )
    async def media_only(
        self,
        interaction: discord.Interaction,
        channel: discord.TextChannel | None = None,
    ) -> None:
        guild = interaction.guild
        actor = interaction.user
        # CONTEXT
        if guild is None:

            await self._reply(
                interaction,
                title="Invalid Context",
                description=("This command can only "
                             "be used in a server."),
            )
            return
        if not isinstance(
                actor,
                discord.Member,
        ):
            return

        # CHANNEL
        target_channel = (channel or interaction.channel)
        if not isinstance(
                target_channel,
                discord.TextChannel,
        ):
            await self._reply(
                interaction,
                title="Invalid Channel",
                description=("Please select a valid "
                             "text channel."),
            )
            return

        # BOT
        bot_member = guild.me
        if bot_member is None:
            return
        perms = (target_channel.permissions_for(bot_member, ))
        missing = []
        if not perms.manage_channels:
            missing.append("Manage Channels", )
        if not perms.manage_messages:
            missing.append("Manage Messages", )
        if not perms.read_message_history:
            missing.append("Read Message History", )
        if missing:
            await self._reply(
                interaction,
                title="Missing Permissions",
                description=("I am missing:\n\n" +
                             "\n".join(f"• `{perm}`" for perm in missing) +
                             (f"\n\nin "
                              f"{target_channel.mention}.")),
            )

            return
        # VIEW
        view = MediaOnlyView(
            guild_id=guild.id,
            channel=target_channel,
            actor_id=actor.id,
        )
        embed = make_embed(
            title="Media-Only Channel Control",
            description=(f"{EMOJIS['announcement']} "
                         f"Manage **media-only mode** "
                         f"for {target_channel.mention}.\n\n"
                         f"{EMOJIS['green_dot']} "
                         "Enable restrictions\n"
                         f"{EMOJIS['red_dot']} "
                         "Disable restrictions\n"
                         f"{EMOJIS['ping']} "
                         "Check current status\n\n"
                         f"{EMOJIS['okay']} "
                         "This panel is visible only to you."),
            level="SYSTEM",
            footer=(f"Channel • "
                    f"#{target_channel.name}"),
        )

        # SEND
        try:
            if interaction.response.is_done():
                message = await interaction.followup.send(
                    embed=embed,
                    view=view,
                    ephemeral=True,
                    wait=True,
                )
            else:
                await interaction.response.send_message(
                    embed=embed,
                    view=view,
                    ephemeral=True,
                )
                message = (await interaction.original_response())
        except discord.HTTPException:
            await self._reply(
                interaction,
                title="Panel Error",
                description=("Failed to create the "
                             "media-only control panel."),
            )

            return

        # ATTACH
        view.message = message

        # LOGGING
        try:
            await send_mod_log(
                guild=guild,
                category="CONFIG",
                title="Media-Only Panel Opened",
                description=("Media-only control "
                             f"opened for "
                             f"{target_channel.mention}."),
                level="INFO",
                actor=actor,
                extra_fields={
                    "Channel ID": target_channel.id,
                },
            )

        except Exception:
            pass


# CENTRALIZED CONFIG ACCESS
setattr(
    MediaOnly.media_only,
    "config_command",
    True,
)


async def setup(bot: commands.Bot, ) -> None:

    await bot.add_cog(MediaOnly(bot), )
