from __future__ import annotations

import logging
from enum import Enum
import discord
from discord import app_commands
from discord.ext import commands

from db.db_helpers.vc_role import (
    get_vc_role_id,
    remove_vc_role_id,
    set_vc_role_id,
)
from utils.core.embeds import make_embed
from utils.core.emojis import EMOJIS
from utils.permissions.check_perms import is_bot_admin_ctx

logger = logging.getLogger("Digital Vigital")


class VCRoleAction(str, Enum):
    """Enum representing available actions for the VC Role command."""
    STATUS = "status"
    ADD = "add"
    REMOVE = "remove"


class VCRoleModule(commands.Cog):
    """Management module for automatic voice channel roles."""

    def __init__(self, bot: commands.Bot) -> None:
        self.bot = bot

    @app_commands.command(
        name="vcrole",
        description=
        "Configure, view, or clear the automatic voice channel role setting.",
    )
    @app_commands.describe(
        action=
        "The action to perform: view status, assign/add a role, or remove configuration.",
        role="The role to assign (Required only when action is 'add').",
    )
    @app_commands.choices(action=[
        app_commands.Choice(name="Status", value=VCRoleAction.STATUS.value),
        app_commands.Choice(name="Add / Setup", value=VCRoleAction.ADD.value),
        app_commands.Choice(name="Remove / Clear",
                            value=VCRoleAction.REMOVE.value)
    ])
    async def vcrole(self,
                     interaction: discord.Interaction,
                     action: app_commands.Choice[str],
                     role: discord.Role | None = None) -> None:
        """Manage VC auto-role configurations using action choices."""
        if not interaction.guild or not isinstance(interaction.user,
                                                   discord.Member):
            return

        # 1. Defer early to prevent the 3-second timeout (10062 Unknown Interaction error)
        await interaction.response.defer()

        # 2. Permission check
        ctx = await self.bot.get_context(interaction)
        if not await is_bot_admin_ctx(ctx):
            embed = make_embed(
                title="Permission Denied",
                description=
                f"{EMOJIS.get('fail', '❌')} You need Bot Admin permissions to use this command.",
                level="ERROR")
            await interaction.followup.send(embed=embed, ephemeral=True)
            return

        action_value = action.value

        # --- ACTION: ADD / SETUP ---
        if action_value == VCRoleAction.ADD.value:
            if role is None:
                embed = make_embed(
                    title="Missing Argument",
                    description=
                    f"{EMOJIS.get('fail', '❌')} You must provide a valid `role` when choosing the **Add / Setup** action.",
                    level="ERROR")
                await interaction.followup.send(embed=embed, ephemeral=True)
                return

            # Hierarchy check
            if role.position >= interaction.guild.me.top_role.position:
                embed = make_embed(
                    title="Hierarchy Error",
                    description=
                    f"{EMOJIS.get('fail', '❌')} I cannot assign {role.mention} because it is equal to or higher than my top role.",
                    level="ERROR")
                await interaction.followup.send(embed=embed, ephemeral=True)
                return

            success = await set_vc_role_id(interaction.guild.id, role.id)
            if success:
                embed = make_embed(
                    title="VC Role Configured",
                    description=
                    f"{EMOJIS.get('success', '✅')} **VC Auto-Role** set to {role.mention}.\nMembers joining voice channels will now receive this role automatically.",
                    level="SUCCESS")
            else:
                embed = make_embed(
                    title="Database Error",
                    description=
                    f"{EMOJIS.get('fail', '❌')} Failed to update database record.",
                    level="ERROR")
            await interaction.followup.send(embed=embed)

        # --- ACTION: STATUS ---
        elif action_value == VCRoleAction.STATUS.value:
            role_id = await get_vc_role_id(interaction.guild.id)
            if role_id and (configured_role :=
                            interaction.guild.get_role(role_id)):
                embed = make_embed(
                    title="VC Role Configuration",
                    description=
                    f"{EMOJIS.get('info', 'ℹ️')} **Active VC Role:** {configured_role.mention} (`ID: {configured_role.id}`)",
                    level="INFO")
            else:
                embed = make_embed(
                    title="VC Role Configuration",
                    description=
                    f"{EMOJIS.get('warning', '⚠️')} No VC Auto-Role is currently configured.",
                    level="WARNING")
            await interaction.followup.send(embed=embed)

        # --- ACTION: REMOVE / CLEAR ---
        elif action_value == VCRoleAction.REMOVE.value:
            success = await remove_vc_role_id(interaction.guild.id)
            if success:
                embed = make_embed(
                    title="VC Role Disabled",
                    description=
                    f"{EMOJIS.get('success', '✅')} Cleared and disabled the VC Auto-Role system.",
                    level="SUCCESS")
            else:
                embed = make_embed(
                    title="Configuration Not Found",
                    description=
                    f"{EMOJIS.get('warning', '⚠️')} No active VC Auto-Role configuration found.",
                    level="WARNING")
            await interaction.followup.send(embed=embed)


async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(VCRoleModule(bot))
