import discord
from discord import app_commands
from discord.ext import commands

from utils.core.embeds import make_embed
from utils.core.emojis import EMOJIS
from utils.logging.mod_log import send_mod_log
from utils.permissions.base_admin import BaseAdminCog
from utils.views.media_only_views import MediaOnlyView


def config_command():

    def decorator(func):
        func.config_command = True
        return func

    return decorator


class MediaOnly(BaseAdminCog):
    """Cog for managing media-only restrictions across guild channels."""

    def __init__(self, bot: commands.Bot) -> None:
        self.bot = bot

    async def _reply(
        self,
        interaction: discord.Interaction,
        *,
        title: str,
        description: str,
        level: str = "ERROR",
    ) -> None:
        embed = make_embed(title=title, description=description, level=level)
        try:
            send_method = (interaction.followup.send
                           if interaction.response.is_done() else
                           interaction.response.send_message)
            await send_method(embed=embed, ephemeral=True)
        except discord.HTTPException:
            pass

    @app_commands.command(name="media_only",
                          description="Manage media-only mode for a channel")
    @app_commands.describe(
        channel="Channel to manage (defaults to current channel)")
    @config_command()
    async def media_only(
        self,
        interaction: discord.Interaction,
        channel: discord.TextChannel | None = None,
    ) -> None:
        guild = interaction.guild
        actor = interaction.user

        if not guild or not isinstance(actor, discord.Member):
            return await self._reply(
                interaction,
                title="Invalid Context",
                description=
                (f"{EMOJIS.get('fail') or '❌'} This command can only be used in a server."
                 ),
            )

        target_channel = channel or interaction.channel
        if not isinstance(target_channel, discord.TextChannel):
            return await self._reply(
                interaction,
                title="Invalid Channel",
                description=
                (f"{EMOJIS.get('fail') or '❌'} Please select a valid text channel."
                 ),
            )

        bot_member = guild.me
        if not bot_member:
            return

        perms = target_channel.permissions_for(bot_member)
        reqs = {
            "Manage Channels": perms.manage_channels,
            "Manage Messages": perms.manage_messages,
            "Read Message History": perms.read_message_history,
        }
        missing = [name for name, present in reqs.items() if not present]

        if missing:
            missing_list = "\n".join(f"• `{p}`" for p in missing)
            warning_icon = EMOJIS.get("warning") or "⚠️"
            return await self._reply(
                interaction,
                title="Missing Permissions",
                description=
                (f"{warning_icon} I am missing the following permissions in {target_channel.mention}:\n\n"
                 f"{missing_list}"),
            )

        view = MediaOnlyView(guild_id=guild.id,
                             channel=target_channel,
                             actor_id=actor.id)

        announcement_icon = EMOJIS.get("announcement") or "📢"
        green_dot = EMOJIS.get("green_dot") or "🟢"
        red_dot = EMOJIS.get("red_dot") or "🔴"
        ping_icon = EMOJIS.get("ping") or "📡"
        okay_icon = EMOJIS.get("okay") or "✅"

        embed = make_embed(
            title="Media-Only Channel Control",
            description=
            (f"{announcement_icon} Manage **media-only mode** for {target_channel.mention}.\n\n"
             f"{green_dot} Enable restrictions\n"
             f"{red_dot} Disable restrictions\n"
             f"{ping_icon} Check current status\n\n"
             f"{okay_icon} This panel is visible only to you."),
            level="SYSTEM",
            footer=f"Channel • #{target_channel.name}",
        )

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
                description=
                (f"{EMOJIS.get('fail') or '❌'} Failed to create the media-only control panel."
                 ))

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


async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(MediaOnly(bot))
