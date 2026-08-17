import discord
from discord.ext import commands

from utils.core.embeds import make_embed
from utils.core.emojis import EMOJIS
from utils.permissions.check_perms import is_bot_admin
from utils.permissions.protected_commands import PROTECTED_COMMANDS
from db.db_helpers.channel_command_restrict import (
    disable_command,
    enable_command,
    get_disabled_commands,
)


class CommandControlView(discord.ui.View):
    """
    Secure Command Control View for managing global guild command restrictions.
    """

    def __init__(
        self,
        *,
        bot: commands.Bot,
        guild: discord.Guild,
        actor_id: int,
    ):
        super().__init__(timeout=180)
        self.bot = bot
        self.guild = guild
        self.actor_id = actor_id
        self.message: discord.Message | None = None

    async def interaction_check(
        self,
        interaction: discord.Interaction,
    ) -> bool:
        """Ensure only the original command caller and bot admins can interact."""
        if interaction.user.id != self.actor_id:
            return False

        if not await is_bot_admin(interaction):
            try:
                if not interaction.response.is_done():
                    await interaction.response.send_message(
                        embed=make_embed(
                            title="Permission Denied",
                            description=
                            "You are not allowed to use this panel.",
                            level="ERROR",
                        ),
                        ephemeral=True,
                    )
            except discord.NotFound:
                pass
            return False

        return True

    @discord.ui.button(
        label="Disable Command",
        emoji=EMOJIS["red_dot"],
        style=discord.ButtonStyle.danger,
    )
    async def disable(
        self,
        interaction: discord.Interaction,
        _button: discord.ui.Button,
    ):
        """Open the command dropdown in disable mode."""
        try:
            await interaction.response.send_message(
                embed=make_embed(
                    title="Disable Command",
                    description=
                    f"{EMOJIS['arrow_point']} Select a command to disable.",
                    level="INFO",
                ),
                view=CommandSelectView(
                    bot=self.bot,
                    guild=self.guild,
                    mode="disable",
                    actor_id=self.actor_id,
                ),
                ephemeral=True,
            )
        except discord.NotFound:
            pass

    @discord.ui.button(
        label="Enable Command",
        emoji=EMOJIS["green_dot"],
        style=discord.ButtonStyle.success,
    )
    async def enable(
        self,
        interaction: discord.Interaction,
        _button: discord.ui.Button,
    ):
        """Open the command dropdown in enable mode."""
        try:
            await interaction.response.send_message(
                embed=make_embed(
                    title="Enable Command",
                    description=
                    f"{EMOJIS['arrow_point']} Select a command to enable.",
                    level="INFO",
                ),
                view=CommandSelectView(
                    bot=self.bot,
                    guild=self.guild,
                    mode="enable",
                    actor_id=self.actor_id,
                ),
                ephemeral=True,
            )
        except discord.NotFound:
            pass

    @discord.ui.button(
        label="Status",
        emoji=EMOJIS["moderation"],
        style=discord.ButtonStyle.secondary,
    )
    async def status(
        self,
        interaction: discord.Interaction,
        _button: discord.ui.Button,
    ):
        """Display the currently disabled commands in the server."""
        disabled = await get_disabled_commands(self.guild.id) # type: ignore

        try:
            await interaction.response.edit_message(
                embed=make_embed(
                    title="Disabled Commands",
                    description=
                    ("\n".join(f"{EMOJIS['arrow_point']} `/{c}`"
                               for c in sorted(disabled)) if disabled else
                     f"{EMOJIS['success']} No commands are currently disabled."
                     ),
                    level="INFO",
                ),
                view=self,
            )
        except discord.NotFound:
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
                        description=
                        f"{EMOJIS['warning']} This control panel has expired.",
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
        mode: str,
        actor_id: int,
    ):
        super().__init__(timeout=60)
        self.bot = bot
        self.guild = guild
        self.mode = mode
        self.actor_id = actor_id

        self.add_item(CommandSelect(self))

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
    """Dropdown component populated with available app commands."""

    def __init__(self, view: CommandSelectView):
        options: list[discord.SelectOption] = []

        for cmd in view.bot.tree.walk_commands():
            name = cmd.qualified_name.lower()

            if name in PROTECTED_COMMANDS:
                continue

            options.append(
                discord.SelectOption(
                    label=f"/{name}"[:100],
                    value=name,
                ))

        super().__init__(
            placeholder="Select a command",
            options=options[:25] if options else [
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

        if self.view_ref.mode == "disable":
            changed = await disable_command(
                guild_id=self.view_ref.guild.id,
                channel_id=None, # type: ignore
                command_name=command_name,
            )
            msg = (
                f"{EMOJIS['success']} `/{command_name}` disabled."
                if changed else
                f"{EMOJIS['warning']} `/{command_name}` is already disabled.")
            level = "SUCCESS" if changed else "WARNING"

        else:
            changed = await enable_command(
                guild_id=self.view_ref.guild.id,
                channel_id=None, # type: ignore
                command_name=command_name,
            )
            msg = (f"{EMOJIS['success']} `/{command_name}` enabled."
                   if changed else
                   f"{EMOJIS['warning']} `/{command_name}` was not disabled.")
            level = "SUCCESS" if changed else "WARNING"

        try:
            await interaction.response.edit_message(
                embed=make_embed(
                    title="Command Updated",
                    description=msg,
                    level=level,
                ),
                view=None,
            )
        except discord.NotFound:
            pass
