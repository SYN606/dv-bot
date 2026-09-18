import asyncio
import discord
from discord import app_commands
from discord.ext import commands

from db.db_helpers.admin_roles import (add_admin_role, get_admin_roles,
                                       remove_admin_role)
from utils.core.embeds import make_embed
from utils.core.emojis import EMOJIS
from utils.permissions.base_admin import BaseAdminCog


class AdminRole(BaseAdminCog):
    """Cog responsible for managing authorized server administration roles."""

    def __init__(self, bot: commands.Bot) -> None:
        self.bot = bot

    adminrole = app_commands.Group(
        name="adminrole",
        description=
        "Manage authorized server administration/bot developer roles.",
        default_permissions=discord.Permissions(administrator=True))

    async def _validate(
        self, interaction: discord.Interaction
    ) -> tuple[discord.Guild, discord.Member] | None:
        guild = interaction.guild
        user = interaction.user

        error_emoji = EMOJIS.get("error") or "❌"

        if guild is None or not isinstance(user, discord.Member):
            await interaction.response.send_message(
                f"{error_emoji} This command can only be executed within a server guild.",
                ephemeral=True)
            return None

        if user.id != guild.owner_id:
            await interaction.response.send_message(
                f"{error_emoji} Administrative override configurations are restricted strictly to the Server Owner.",
                ephemeral=True)
            return None

        return guild, user

    @adminrole.command(
        name="add",
        description=
        "Authorize a role for administrative bot override permissions.")
    @app_commands.describe(
        role="The target role to grant administrative bot status.")
    async def add(self, interaction: discord.Interaction,
                  role: discord.Role) -> None:
        validated = await self._validate(interaction)
        if not validated:
            return
        guild, user = validated

        warning_emoji = EMOJIS.get("warning") or "⚠️"
        error_emoji = EMOJIS.get("error") or "❌"
        success_emoji = EMOJIS.get("success") or "✅"

        if role.is_default():
            await interaction.response.send_message(
                f"{warning_emoji} Cannot assign the default `@everyone` profile as an admin role.",
                ephemeral=True)
            return

        if role.managed:
            await interaction.response.send_message(
                f"{warning_emoji} Managed external application or bot integration roles cannot be registered.",
                ephemeral=True)
            return

        bot_member = guild.me
        if bot_member:
            if not bot_member.guild_permissions.manage_roles:
                await interaction.response.send_message(
                    f"{error_emoji} I lack the `Manage Roles` application permission within this guild hierarchy.",
                    ephemeral=True)
                return

            if role >= bot_member.top_role:
                await interaction.response.send_message(
                    f"{error_emoji} Action denied: Target role position is equal to or higher than my highest role positioning.",
                    ephemeral=True)
                return

        if role >= user.top_role and user.id != guild.owner_id:
            await interaction.response.send_message(
                f"{error_emoji} Action denied: You cannot configure roles higher than or equal to your own top status position.",
                ephemeral=True)
            return

        added = await add_admin_role(guild.id, role.id)

        description = (
            f"{success_emoji} Authorized {role.mention} as a bot administrator override."
            if added else
            f"{warning_emoji} Role {role.mention} is already registered in the system."
        )

        await interaction.response.send_message(embed=make_embed(
            title="Admin Role Configured",
            description=description,
            level="SUCCESS" if added else "WARNING"),
                                                ephemeral=True)

    @adminrole.command(
        name="remove",
        description=
        "Revoke administrative bot override authorization from a role.")
    @app_commands.describe(
        role="The target role to strip bot administrative permissions from.")
    async def remove(self, interaction: discord.Interaction,
                     role: discord.Role) -> None:
        validated = await self._validate(interaction)
        if not validated:
            return
        guild, _ = validated

        warning_emoji = EMOJIS.get("warning") or "⚠️"
        success_emoji = EMOJIS.get("success") or "✅"

        removed = await remove_admin_role(guild.id, role.id)

        description = (
            f"{success_emoji} Stripped bot administrative overrides from {role.mention} cleanly."
            if removed else
            f"{warning_emoji} Target role {role.name} was not flagged as an authorized administrator profile."
        )

        await interaction.response.send_message(
            embed=make_embed(
                title="Admin Role Deauthorized",
                description=description,
                level="SUCCESS" if removed else "WARNING",
            ),
            ephemeral=True,
        )

    @adminrole.command(
        name="list",
        description=
        "Display all custom administrative role definitions for this server.",
    )
    async def list_roles(self, interaction: discord.Interaction) -> None:
        validated = await self._validate(interaction)
        if not validated:
            return
        guild, _ = validated

        warning_emoji = EMOJIS.get("warning") or "⚠️"

        role_ids = await get_admin_roles(guild.id)
        roles: list[str] = []

        for role_id in role_ids:
            role = guild.get_role(role_id)
            if role:
                roles.append(role.mention)

        description = (
            "\n".join(roles) if roles else
            f"{warning_emoji} No role configurations discovered within database schemas."
        )

        await interaction.response.send_message(embed=make_embed(
            title="Configured Bot Administrators",
            description=description,
            level="INFO"),
                                                ephemeral=True)

    @adminrole.command(
        name="reset",
        description=
        "Wipe all configured administrative roles from the database.",
    )
    async def reset(self, interaction: discord.Interaction) -> None:
        validated = await self._validate(interaction)
        if not validated:
            return
        guild, _ = validated

        warning_emoji = EMOJIS.get("warning") or "⚠️"
        success_emoji = EMOJIS.get("success") or "✅"

        role_ids = await get_admin_roles(guild.id)
        if not role_ids:
            await interaction.response.send_message(embed=make_embed(
                title="Registry Already Clear",
                description=
                f"{warning_emoji} No admin roles are configured for this guild entity.",
                level="WARNING"),
                                                    ephemeral=True)
            return

        await asyncio.gather(*(remove_admin_role(guild.id, role_id)
                               for role_id in role_ids))

        await interaction.response.send_message(embed=make_embed(
            title="Registry Flush Complete",
            description=
            f"{success_emoji} Flushed all administrative role records cleanly from database caches.",
            level="SUCCESS"),
                                                ephemeral=True)


async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(AdminRole(bot))
