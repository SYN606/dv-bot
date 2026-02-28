import discord

from utils.embeds import make_embed
from utils.emojis import EMOJIS
from utils.check_perms import is_bot_admin
from utils.protected_commands import PROTECTED_COMMANDS
from db.db_helpers.channel_command_restrict import (
    disable_command,
    enable_command,
    get_disabled_commands,
)


class CommandControlView(discord.ui.View):
    """
    Secure Command Control View

    - Single ephemeral panel
    - Button driven
    - Permission locked
    - Lifecycle safe
    """

    def __init__(
        self,
        *,
        bot: discord.Client,
        guild: discord.Guild,
        actor_id: int,
    ):
        super().__init__(timeout=180)

        self.bot = bot
        self.guild = guild
        self.actor_id = actor_id
        self.message: discord.Message | None = None

    # ─────────────────────────
    # Secure interaction guard
    # ─────────────────────────
    async def interaction_check(
        self,
        interaction: discord.Interaction,
    ) -> bool:

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

    # ─────────────────────────
    # DISABLE
    # ─────────────────────────
    @discord.ui.button(
        label="Disable Command",
        emoji=EMOJIS["red_dot"],
        style=discord.ButtonStyle.danger,
    )
    async def disable(self, interaction: discord.Interaction, _):

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

    # ─────────────────────────
    # ENABLE
    # ─────────────────────────
    @discord.ui.button(
        label="Enable Command",
        emoji=EMOJIS["green_dot"],
        style=discord.ButtonStyle.success,
    )
    async def enable(self, interaction: discord.Interaction, _):

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

    # ─────────────────────────
    # STATUS
    # ─────────────────────────
    @discord.ui.button(
        label="Status",
        emoji=EMOJIS["pants"],
        style=discord.ButtonStyle.secondary,
    )
    async def status(self, interaction: discord.Interaction, _):

        disabled = await get_disabled_commands(self.guild.id)

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

    # ─────────────────────────
    # TIMEOUT
    # ─────────────────────────
    async def on_timeout(self):

        for item in self.children:
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


# ─────────────────────────────────────
# COMMAND SELECT VIEW
# ─────────────────────────────────────
class CommandSelectView(discord.ui.View):

    def __init__(
        self,
        *,
        bot: discord.Client,
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

    async def interaction_check(self,
                                interaction: discord.Interaction) -> bool:
        if interaction.user.id != self.actor_id:
            return False
        if not await is_bot_admin(interaction):
            return False
        return True


class CommandSelect(discord.ui.Select):

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
                self.view_ref.guild.id,
                command_name,
            )
            msg = (
                f"{EMOJIS['success']} `/{command_name}` disabled."
                if changed else
                f"{EMOJIS['warning']} `/{command_name}` is already disabled.")
            level = "SUCCESS" if changed else "WARNING"

        else:
            changed = await enable_command(
                self.view_ref.guild.id,
                command_name,
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
