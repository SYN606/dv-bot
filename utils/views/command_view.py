from __future__ import annotations

from typing import Optional, Sequence
import discord
from discord.ext import commands

from db.db_helpers.channel_command_restrict import (
    disable_command,
    enable_command,
    get_disabled_commands,
)
from utils.core.embeds import make_embed
from utils.core.emojis import EMOJIS
from utils.permissions.check_perms import is_bot_admin
from utils.permissions.protected_commands import PROTECTED_COMMANDS


class CommandControlView(discord.ui.View):
    """Command control panel for restrictions in a specific channel."""

    def __init__(
        self,
        *,
        bot: commands.Bot,
        guild: discord.Guild,
        channel: Optional[discord.abc.GuildChannel] = None,
        actor_id: int,
    ):
        super().__init__(timeout=180)
        self.bot = bot
        self.guild = guild
        self.channel = channel
        self.actor_id = actor_id
        self.message: discord.Message | None = None

    async def interaction_check(
        self,
        interaction: discord.Interaction,
    ) -> bool:
        """Ensure only the original command caller and authorized staff can interact."""
        if interaction.user.id != self.actor_id:
            try:
                if not interaction.response.is_done():
                    await interaction.response.send_message(
                        embed=make_embed(
                            title="Panel Locked",
                            description="This control panel is locked to the original caller.",
                            level="WARNING",
                        ),
                        ephemeral=True,
                    )
            except (discord.NotFound, discord.HTTPException):
                pass
            return False

        if not await is_bot_admin(interaction):
            try:
                if not interaction.response.is_done():
                    await interaction.response.send_message(
                        embed=make_embed(
                            title="Permission Denied",
                            description="You do not have administrative authority to manage commands.",
                            level="ERROR",
                        ),
                        ephemeral=True,
                    )
            except (discord.NotFound, discord.HTTPException):
                pass
            return False

        return True

    def _resolve_target_channel(
        self, interaction: discord.Interaction
    ) -> discord.abc.GuildChannel | None:
        if self.channel is not None:
            return self.channel
        if interaction.channel is not None and isinstance(
            interaction.channel, discord.abc.GuildChannel
        ):
            self.channel = interaction.channel
            return self.channel
        return None

    @discord.ui.button(
        label="Disable Command",
        emoji=EMOJIS.get("red_dot", "🔴"),
        style=discord.ButtonStyle.danger,
    )
    async def disable(
        self,
        interaction: discord.Interaction,
        _button: discord.ui.Button,
    ):
        """Open the command dropdown in disable mode."""
        target_channel = self._resolve_target_channel(interaction)
        if target_channel is None:
            return

        disabled = await get_disabled_commands(self.guild.id, target_channel.id)

        arrow = EMOJIS.get("arrow_point", "👉")
        info = EMOJIS.get("announcement", "ℹ️")
        try:
            await interaction.response.send_message(
                embed=make_embed(
                    title="Disable Command",
                    description=(
                        f"{arrow} Select a command to disable in {target_channel.mention}.\n\n"
                        f"*{info} Note: Server Administrators bypass channel command restrictions.*"
                    ),
                    level="INFO",
                    footer=f"Channel • #{getattr(target_channel, 'name', 'channel')}",
                ),
                view=CommandSelectView(
                    bot=self.bot,
                    guild=self.guild,
                    channel=target_channel,
                    mode="disable",
                    actor_id=self.actor_id,
                    disabled_commands=disabled,
                ),
                ephemeral=True,
            )
        except (discord.NotFound, discord.HTTPException):
            pass

    @discord.ui.button(
        label="Enable Command",
        emoji=EMOJIS.get("green_dot", "🟢"),
        style=discord.ButtonStyle.success,
    )
    async def enable(
        self,
        interaction: discord.Interaction,
        _button: discord.ui.Button,
    ):
        """Open the command dropdown in enable mode."""
        target_channel = self._resolve_target_channel(interaction)
        if target_channel is None:
            return

        disabled = await get_disabled_commands(self.guild.id, target_channel.id)
        if not disabled:
            try:
                await interaction.response.send_message(
                    embed=make_embed(
                        title="No Disabled Commands",
                        description=f"{EMOJIS.get('success', '✅')} There are currently no disabled commands in {target_channel.mention}.",
                        level="INFO",
                    ),
                    ephemeral=True,
                )
            except (discord.NotFound, discord.HTTPException):
                pass
            return

        arrow = EMOJIS.get("arrow_point", "👉")
        try:
            await interaction.response.send_message(
                embed=make_embed(
                    title="Enable Command",
                    description=f"{arrow} Select a command to re-enable in {target_channel.mention}.",
                    level="INFO",
                    footer=f"Channel • #{getattr(target_channel, 'name', 'channel')}",
                ),
                view=CommandSelectView(
                    bot=self.bot,
                    guild=self.guild,
                    channel=target_channel,
                    mode="enable",
                    actor_id=self.actor_id,
                    disabled_commands=disabled,
                ),
                ephemeral=True,
            )
        except (discord.NotFound, discord.HTTPException):
            pass

    @discord.ui.button(
        label="Status",
        emoji=EMOJIS.get("moderation", "🛡️"),
        style=discord.ButtonStyle.secondary,
    )
    async def status(
        self,
        interaction: discord.Interaction,
        _button: discord.ui.Button,
    ):
        """Display the currently disabled commands in the channel."""
        target_channel = self._resolve_target_channel(interaction)
        if target_channel is None:
            return

        disabled = await get_disabled_commands(self.guild.id, target_channel.id)

        arrow = EMOJIS.get("arrow_point", "👉")
        info = EMOJIS.get("announcement", "ℹ️")
        success = EMOJIS.get("success", "✅")

        desc = (
            f"**Target Channel:** {target_channel.mention}\n\n"
            + (
                "\n".join(f"{arrow} `/{c}`" for c in sorted(disabled))
                if disabled
                else f"{success} No commands are currently disabled in this channel."
            )
            + f"\n\n*{info} Server Administrators bypass channel restrictions.*"
        )

        try:
            await interaction.response.edit_message(
                embed=make_embed(
                    title=f"Command Status • #{getattr(target_channel, 'name', 'channel')}",
                    description=desc,
                    level="INFO",
                    footer=f"Total Disabled: {len(disabled)}",
                ),
                view=self,
            )
        except (discord.NotFound, discord.HTTPException):
            pass

    async def on_timeout(self):
        """Disable all controls when the view times out."""
        for item in self.children:
            if isinstance(item, (discord.ui.Button, discord.ui.Select)):
                item.disabled = True

        try:
            if self.message:
                await self.message.edit(
                    embed=make_embed(
                        title="Command Panel Expired",
                        description=f"{EMOJIS.get('warning', '⚠️')} This control panel has expired.",
                        level="WARNING",
                    ),
                    view=self,
                )
        except (discord.NotFound, discord.HTTPException):
            pass


class CommandSelectView(discord.ui.View):
    """Container view for selecting a command from a dropdown menu."""

    def __init__(
        self,
        *,
        bot: commands.Bot,
        guild: discord.Guild,
        channel: discord.abc.GuildChannel,
        mode: str,
        actor_id: int,
        disabled_commands: Sequence[str] = (),
    ):
        super().__init__(timeout=60)
        self.bot = bot
        self.guild = guild
        self.channel = channel
        self.mode = mode
        self.actor_id = actor_id

        self.add_item(
            CommandSelect(
                self,
                disabled_commands=set(c.lower() for c in disabled_commands),
            )
        )

    async def interaction_check(
        self,
        interaction: discord.Interaction,
    ) -> bool:
        if interaction.user.id != self.actor_id:
            return False
        if not await is_bot_admin(interaction):
            return False
        return True


class CommandSelect(discord.ui.Select):
    """Dropdown component populated with available commands."""

    def __init__(
        self,
        view: CommandSelectView,
        disabled_commands: set[str],
    ):
        options: list[discord.SelectOption] = []
        mode = view.mode

        if mode == "disable":
            # Gather all unique app and prefix commands
            command_names: set[str] = set()
            for cmd in view.bot.tree.walk_commands():
                if isinstance(cmd, discord.app_commands.Group):
                    continue
                command_names.add(cmd.qualified_name.lower())

            for cmd in view.bot.commands:
                command_names.add(cmd.qualified_name.lower())

            for name in sorted(command_names):
                if name in PROTECTED_COMMANDS or name in disabled_commands:
                    continue
                options.append(
                    discord.SelectOption(
                        label=f"/{name}"[:100],
                        value=name,
                    )
                )
        else:
            # Enable mode - list only currently disabled commands
            for name in sorted(disabled_commands):
                options.append(
                    discord.SelectOption(
                        label=f"/{name}"[:100],
                        value=name,
                    )
                )

        super().__init__(
            placeholder=(
                "Select a command to disable"
                if mode == "disable"
                else "Select a command to enable"
            ),
            options=options[:25]
            if options
            else [
                discord.SelectOption(
                    label="No commands available",
                    value="none",
                )
            ],
            disabled=not options,
        )
        self.view_ref = view

    async def callback(self, interaction: discord.Interaction):
        command_name = self.values[0]

        if command_name == "none":
            return

        channel = self.view_ref.channel
        guild_id = self.view_ref.guild.id
        channel_id = channel.id

        if self.view_ref.mode == "disable":
            changed = await disable_command(
                guild_id=guild_id,
                channel_id=channel_id,
                command_name=command_name,
            )
            msg = (
                f"{EMOJIS.get('success', '✅')} Command `/{command_name}` has been **disabled** in {channel.mention}.\n\n"
                f"*{EMOJIS.get('announcement', 'ℹ️')} Non-administrators cannot execute this command here.*"
                if changed
                else f"{EMOJIS.get('warning', '⚠️')} `/{command_name}` is already disabled in {channel.mention}."
            )
            level = "SUCCESS" if changed else "WARNING"
        else:
            changed = await enable_command(
                guild_id=guild_id,
                channel_id=channel_id,
                command_name=command_name,
            )
            msg = (
                f"{EMOJIS.get('success', '✅')} Command `/{command_name}` has been **re-enabled** in {channel.mention}."
                if changed
                else f"{EMOJIS.get('warning', '⚠️')} `/{command_name}` was not disabled in {channel.mention}."
            )
            level = "SUCCESS" if changed else "WARNING"

        try:
            await interaction.response.edit_message(
                embed=make_embed(
                    title="Command Updated",
                    description=msg,
                    level=level,
                    footer=f"Channel • #{getattr(channel, 'name', 'channel')}",
                ),
                view=None,
            )
        except (discord.NotFound, discord.HTTPException):
            pass
