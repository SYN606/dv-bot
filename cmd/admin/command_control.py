from __future__ import annotations

from typing import Optional, Sequence
import discord
from discord import app_commands
from discord.ext import commands

from db.db_helpers.channel_command_restrict import (
    disable_command,
    enable_command,
    get_disabled_commands
)
from utils.core.embeds import make_embed
from utils.core.emojis import EMOJIS
from utils.logging.mod_log import send_mod_log
from utils.permissions.base_admin import BaseAdminCog, config_command
from utils.permissions.protected_commands import PROTECTED_COMMANDS
from utils.views.command_view import CommandControlView


class CommandControl(BaseAdminCog):
    """Cog responsible for managing channel-specific command restrictions."""

    def __init__(self, bot: commands.Bot) -> None:
        self.bot = bot

    def _get_all_command_names(self) -> set[str]:
        """Collect all unique registered app command and prefix command names."""
        names: set[str] = set()
        for cmd in self.bot.tree.walk_commands():
            if isinstance(cmd, app_commands.Group):
                continue
            names.add(cmd.qualified_name.lower())
        for cmd in self.bot.commands:
            names.add(cmd.qualified_name.lower())
        return names

    async def _autocomplete_disable_command(
        self,
        interaction: discord.Interaction,
        current: str,
    ) -> list[app_commands.Choice[str]]:
        if not interaction.guild:
            return []

        # Find target channel from options if already specified, or fallback to current channel
        target_channel_id = interaction.channel_id
        if interaction.data and "options" in interaction.data:
            for opt in interaction.data.get("options", []):
                # Search nested options for subcommands
                for subopt in opt.get("options", []):
                    if subopt.get("name") == "channel" and subopt.get("value"):
                        try:
                            target_channel_id = int(subopt["value"])
                        except (ValueError, TypeError):
                            pass

        disabled: set[str] = set()
        if target_channel_id:
            raw_disabled = await get_disabled_commands(
                interaction.guild.id, target_channel_id
            )
            disabled = {d.lower() for d in raw_disabled}

        query = current.strip().lower()
        all_cmds = self._get_all_command_names()

        choices: list[app_commands.Choice[str]] = []
        for name in sorted(all_cmds):
            if name in PROTECTED_COMMANDS or name in disabled:
                continue
            if not query or query in name:
                choices.append(app_commands.Choice(name=f"/{name}", value=name))
                if len(choices) >= 25:
                    break
        return choices

    async def _autocomplete_enable_command(
        self,
        interaction: discord.Interaction,
        current: str,
    ) -> list[app_commands.Choice[str]]:
        if not interaction.guild:
            return []

        target_channel_id = interaction.channel_id
        if interaction.data and "options" in interaction.data:
            for opt in interaction.data.get("options", []):
                for subopt in opt.get("options", []):
                    if subopt.get("name") == "channel" and subopt.get("value"):
                        try:
                            target_channel_id = int(subopt["value"])
                        except (ValueError, TypeError):
                            pass

        if not target_channel_id:
            return []

        disabled = await get_disabled_commands(
            interaction.guild.id, target_channel_id
        )
        query = current.strip().lower()

        choices: list[app_commands.Choice[str]] = []
        for name in sorted(disabled):
            if not query or query in name.lower():
                choices.append(app_commands.Choice(name=f"/{name}", value=name))
                if len(choices) >= 25:
                    break
        return choices

    # --- HYBRID GROUP ---

    @commands.hybrid_group(
        name="command",
        description="Manage command restrictions in channels (disable / enable / list / panel).",
        invoke_without_command=True,
    )
    @app_commands.default_permissions(manage_guild=True)
    @config_command()
    async def command_group(
        self,
        ctx: commands.Context,
        channel: Optional[discord.TextChannel] = None,
    ) -> None:
        """Command group root: opens the interactive command control panel if no subcommand was given."""
        target_channel = channel or (
            ctx.channel if isinstance(ctx.channel, discord.TextChannel) else None
        )
        if target_channel is None or ctx.guild is None:
            await self._reply(
                ctx,
                title="Invalid Channel",
                description=f"{EMOJIS.get('fail', '❌')} Please specify a valid text channel.",
                level="ERROR",
            )
            return

        await self._send_panel(ctx, target_channel)

    @command_group.command(
        name="panel",
        description="Open the interactive command control panel for a channel.",
    )
    @app_commands.describe(
        channel="Channel to manage (defaults to current channel)"
    )
    @config_command()
    async def panel(
        self,
        ctx: commands.Context,
        channel: Optional[discord.TextChannel] = None,
    ) -> None:
        """Open the interactive management panel."""
        target_channel = channel or (
            ctx.channel if isinstance(ctx.channel, discord.TextChannel) else None
        )
        if target_channel is None or ctx.guild is None:
            await self._reply(
                ctx,
                title="Invalid Channel",
                description=f"{EMOJIS.get('fail', '❌')} Please specify a valid text channel.",
                level="ERROR",
            )
            return

        await self._send_panel(ctx, target_channel)

    async def _send_panel(
        self,
        ctx: commands.Context,
        target_channel: discord.TextChannel,
    ) -> None:
        guild = ctx.guild
        if guild is None:
            return

        view = CommandControlView(
            bot=self.bot,
            guild=guild,
            channel=target_channel,
            actor_id=ctx.author.id,
        )

        announcement = EMOJIS.get("announcement", "📢")
        arrow = EMOJIS.get("arrow_point", "👉")
        warning = EMOJIS.get("warning", "⚠️")
        info = EMOJIS.get("announcement", "ℹ️")

        embed = make_embed(
            title="Command Control Panel",
            description=(
                f"{announcement} Manage command availability for {target_channel.mention}.\n\n"
                f"{arrow} **Disable Command:** Block a command in this channel\n"
                f"{arrow} **Enable Command:** Restore a disabled command\n"
                f"{arrow} **Status:** View all restricted commands\n\n"
                f"{warning} *Protected commands ({', '.join(f'`/{c}`' for c in sorted(PROTECTED_COMMANDS))}) cannot be disabled.*\n"
                f"{info} *Note: Server Administrators bypass channel restrictions.*"
            ),
            level="SYSTEM",
            footer=f"Channel • #{target_channel.name}",
        )

        if ctx.interaction:
            try:
                if ctx.interaction.response.is_done():
                    msg = await ctx.interaction.followup.send(
                        embed=embed, view=view, ephemeral=True, wait=True
                    )
                else:
                    await ctx.interaction.response.send_message(
                        embed=embed, view=view, ephemeral=True
                    )
                    msg = await ctx.interaction.original_response()
                view.message = msg
                return
            except (discord.NotFound, discord.HTTPException):
                pass

        try:
            view.message = await ctx.send(embed=embed, view=view)
        except (discord.NotFound, discord.HTTPException):
            pass

    @command_group.command(
        name="disable",
        description="Disable a bot command in a specific channel.",
    )
    @app_commands.describe(
        command="The command to disable (e.g. ping, userstats)",
        channel="Channel where the command will be disabled (defaults to current channel)",
    )
    @app_commands.autocomplete(command=_autocomplete_disable_command)
    @config_command()
    async def disable(
        self,
        ctx: commands.Context,
        command: str,
        channel: Optional[discord.TextChannel] = None,
    ) -> None:
        """Disable a command in a specific channel."""
        guild = ctx.guild
        if guild is None:
            return

        target_channel = channel or (
            ctx.channel if isinstance(ctx.channel, discord.TextChannel) else None
        )
        if target_channel is None:
            await self._reply(
                ctx,
                title="Invalid Channel",
                description=f"{EMOJIS.get('fail', '❌')} Please specify a valid text channel.",
                level="ERROR",
            )
            return

        normalized = command.strip().lower().lstrip("/")
        if normalized in PROTECTED_COMMANDS:
            await self._reply(
                ctx,
                title="Protected Command",
                description=(
                    f"{EMOJIS.get('warning', '⚠️')} Command `/{normalized}` is a critical core command and **cannot be disabled**."
                ),
                level="WARNING",
            )
            return

        all_cmds = self._get_all_command_names()
        if normalized not in all_cmds:
            await self._reply(
                ctx,
                title="Unknown Command",
                description=(
                    f"{EMOJIS.get('warning', '⚠️')} `/{normalized}` is not recognized as a registered bot command."
                ),
                level="WARNING",
            )
            return

        changed = await disable_command(
            guild_id=guild.id,
            channel_id=target_channel.id,
            command_name=normalized,
        )

        if changed:
            await self._reply(
                ctx,
                title="Command Disabled",
                description=(
                    f"{EMOJIS.get('success', '✅')} Successfully disabled `/{normalized}` in {target_channel.mention}.\n\n"
                    f"*{EMOJIS.get('announcement', 'ℹ️')} Non-administrators can no longer execute this command here.*"
                ),
                level="SUCCESS",
            )
            await send_mod_log(
                guild=guild,
                category="CONFIG",
                title="Command Restricted",
                description=f"Command `/{normalized}` disabled in {target_channel.mention}.",
                level="WARNING",
                actor=ctx.author if isinstance(ctx.author, discord.Member) else None,
                extra_fields={
                    "Command": f"/{normalized}",
                    "Channel": f"#{target_channel.name} ({target_channel.id})",
                },
            )
        else:
            await self._reply(
                ctx,
                title="Already Disabled",
                description=(
                    f"{EMOJIS.get('warning', '⚠️')} Command `/{normalized}` is already disabled in {target_channel.mention}."
                ),
                level="WARNING",
            )

    @command_group.command(
        name="enable",
        description="Re-enable a disabled bot command in a channel.",
    )
    @app_commands.describe(
        command="The command to re-enable",
        channel="Channel where the command will be re-enabled (defaults to current channel)",
    )
    @app_commands.autocomplete(command=_autocomplete_enable_command)
    @config_command()
    async def enable(
        self,
        ctx: commands.Context,
        command: str,
        channel: Optional[discord.TextChannel] = None,
    ) -> None:
        """Re-enable a command in a specific channel."""
        guild = ctx.guild
        if guild is None:
            return

        target_channel = channel or (
            ctx.channel if isinstance(ctx.channel, discord.TextChannel) else None
        )
        if target_channel is None:
            await self._reply(
                ctx,
                title="Invalid Channel",
                description=f"{EMOJIS.get('fail', '❌')} Please specify a valid text channel.",
                level="ERROR",
            )
            return

        normalized = command.strip().lower().lstrip("/")
        changed = await enable_command(
            guild_id=guild.id,
            channel_id=target_channel.id,
            command_name=normalized,
        )

        if changed:
            await self._reply(
                ctx,
                title="Command Re-enabled",
                description=(
                    f"{EMOJIS.get('success', '✅')} Successfully re-enabled `/{normalized}` in {target_channel.mention}."
                ),
                level="SUCCESS",
            )
            await send_mod_log(
                guild=guild,
                category="CONFIG",
                title="Command Unrestricted",
                description=f"Command `/{normalized}` re-enabled in {target_channel.mention}.",
                level="INFO",
                actor=ctx.author if isinstance(ctx.author, discord.Member) else None,
                extra_fields={
                    "Command": f"/{normalized}",
                    "Channel": f"#{target_channel.name} ({target_channel.id})",
                },
            )
        else:
            await self._reply(
                ctx,
                title="Not Disabled",
                description=(
                    f"{EMOJIS.get('warning', '⚠️')} Command `/{normalized}` was not disabled in {target_channel.mention}."
                ),
                level="WARNING",
            )

    @command_group.command(
        name="list",
        description="List all commands currently disabled in a channel.",
    )
    @app_commands.describe(
        channel="Channel to inspect (defaults to current channel)"
    )
    @config_command()
    async def list_disabled(
        self,
        ctx: commands.Context,
        channel: Optional[discord.TextChannel] = None,
    ) -> None:
        """List all disabled commands in the given channel."""
        guild = ctx.guild
        if guild is None:
            return

        target_channel = channel or (
            ctx.channel if isinstance(ctx.channel, discord.TextChannel) else None
        )
        if target_channel is None:
            await self._reply(
                ctx,
                title="Invalid Channel",
                description=f"{EMOJIS.get('fail', '❌')} Please specify a valid text channel.",
                level="ERROR",
            )
            return

        disabled = await get_disabled_commands(guild.id, target_channel.id)

        arrow = EMOJIS.get("arrow_point", "👉")
        success = EMOJIS.get("success", "✅")
        info = EMOJIS.get("announcement", "ℹ️")

        if disabled:
            cmds_formatted = "\n".join(
                f"{arrow} `/{c}`" for c in sorted(disabled)
            )
            description = (
                f"The following commands are currently **disabled** in {target_channel.mention}:\n\n"
                f"{cmds_formatted}\n\n"
                f"*{info} Server Administrators bypass channel command restrictions.*"
            )
        else:
            description = (
                f"{success} No commands are currently disabled in {target_channel.mention}."
            )

        await self._reply(
            ctx,
            title=f"Disabled Commands • #{target_channel.name}",
            description=description,
            level="INFO",
            show_footer=False,
        )

    # --- PREFIX SHORTCUTS ---

    @commands.command(name="disable", hidden=True)
    @commands.guild_only()
    @config_command()
    async def prefix_disable(
        self,
        ctx: commands.Context,
        command: str,
        channel: Optional[discord.TextChannel] = None,
    ) -> None:
        """Prefix shortcut: !disable <command> [#channel]"""
        await self.disable(ctx, command=command, channel=channel)

    @commands.command(name="enable", hidden=True)
    @commands.guild_only()
    @config_command()
    async def prefix_enable(
        self,
        ctx: commands.Context,
        command: str,
        channel: Optional[discord.TextChannel] = None,
    ) -> None:
        """Prefix shortcut: !enable <command> [#channel]"""
        await self.enable(ctx, command=command, channel=channel)


async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(CommandControl(bot))
