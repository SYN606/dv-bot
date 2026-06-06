import asyncio
import discord
from discord.ext import commands
from discord import app_commands
from utils.permissions.base_admin import BaseAdminCog
from utils.core.embeds import make_embed
from utils.core.emojis import EMOJIS
from db.db_helpers.admin_roles import (add_admin_role, remove_admin_role,
                                       get_admin_roles)


class AdminRole(BaseAdminCog):

    def __init__(self, bot: commands.Bot):
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

        if guild is None or not isinstance(user, discord.Member):
            await interaction.response.send_message(
                f"{EMOJIS.get('error', '❌')} This command can only be executed within a server guild.",
                ephemeral=True)
            return None

        if user.id != guild.owner_id:
            await interaction.response.send_message(
                f"{EMOJIS.get('error', '❌')} Administrative override configurations are restricted strictly to the Server Owner.",
                ephemeral=True)
            return None

        return guild, user

    @adminrole.command(
        name="add",
        description=
        "Authorize a role for administrative bot override permissions.")
    @app_commands.describe(
        role="The target role to grant administrative bot status.")
    async def add(self, interaction: discord.Interaction, role: discord.Role):
        validated = await self._validate(interaction)
        if not validated:
            return
        guild, user = validated

        if role.is_default():
            await interaction.response.send_message(
                f"{EMOJIS.get('warning', '⚠️')} Cannot assign the default `@everyone` profile as an admin role.",
                ephemeral=True)
            return

        if role.managed:
            await interaction.response.send_message(
                f"{EMOJIS.get('warning', '⚠️')} Managed external application or bot integration roles cannot be registered.",
                ephemeral=True)
            return

        bot_member = guild.me
        if bot_member:
            if not bot_member.guild_permissions.manage_roles:
                await interaction.response.send_message(
                    f"{EMOJIS.get('error', '❌')} I lack the `Manage Roles` application permission within this guild hierarchy.",
                    ephemeral=True)
                return

            if role >= bot_member.top_role:
                await interaction.response.send_message(
                    f"{EMOJIS.get('error', '❌')} Action denied: Target role position is equal to or higher than my highest role positioning.",
                    ephemeral=True)
                return

        if role >= user.top_role and user.id != guild.owner_id:
            await interaction.response.send_message(
                f"{EMOJIS.get('error', '❌')} Action denied: You cannot configure roles higher than or equal to your own top status position.",
                ephemeral=True)
            return

        added = await add_admin_role(guild.id, role.id)

        await interaction.response.send_message(embed=make_embed(
            title="Admin Role Configured",
            description=
            (f"{EMOJIS['success']} Authorized {role.mention} as a bot administrator override."
             if added else
             f"{EMOJIS['warning']} Role {role.mention} is already registered in the system."
             ),
            level="SUCCESS" if added else "WARNING",
        ),
                                                ephemeral=True)

    @adminrole.command(
        name="remove",
        description=
        "Revoke administrative bot override authorization from a role.")
    @app_commands.describe(
        role="The target role to strip bot administrative permissions from.")
    async def remove(self, interaction: discord.Interaction,
                     role: discord.Role):
        validated = await self._validate(interaction)
        if not validated:
            return
        guild, _ = validated

        removed = await remove_admin_role(guild.id, role.id)

        await interaction.response.send_message(embed=make_embed(
            title="Admin Role Deauthorized",
            description=
            (f"{EMOJIS['success']} Stripped bot administrative overrides from {role.mention} cleanly."
             if removed else
             f"{EMOJIS['warning']} Target role {role.name} was not flagged as an authorized administrator profile."
             ),
            level="SUCCESS" if removed else "WARNING"),
                                                ephemeral=True)

    @adminrole.command(
        name="list",
        description=
        "Display all custom administrative role definitions for this server.")
    async def list_roles(self, interaction: discord.Interaction):
        validated = await self._validate(interaction)
        if not validated:
            return
        guild, _ = validated

        role_ids = await get_admin_roles(guild.id)
        roles: list[str] = []

        for role_id in role_ids:
            role = guild.get_role(role_id)
            if role:
                roles.append(role.mention)

        description = (
            "\n".join(roles) if roles else
            f"{EMOJIS['warning']} No role configurations discovered within database schemas."
        )

        await interaction.response.send_message(embed=make_embed(
            title="Configured Bot Administrators",
            description=description,
            level="INFO"),
                                                ephemeral=True)

    @adminrole.command(
        name="reset",
        description=
        "Wipe all configured administrative roles from the database.")
    async def reset(self, interaction: discord.Interaction):
        validated = await self._validate(interaction)
        if not validated:
            return
        guild, _ = validated

        role_ids = await get_admin_roles(guild.id)
        if not role_ids:
            await interaction.response.send_message(embed=make_embed(
                title="Registry Already Clear",
                description=
                f"{EMOJIS['warning']} No admin roles are configured for this guild entity.",
                level="WARNING"),
                                                    ephemeral=True)
            return

        await asyncio.gather(*(remove_admin_role(guild.id, role_id)
                               for role_id in role_ids))

        await interaction.response.send_message(embed=make_embed(
            title="Registry Flush Complete",
            description=
            f"{EMOJIS['success']} Flushed all administrative role records cleanly from database caches.",
            level="SUCCESS"),
                                                ephemeral=True)


async def setup(bot: commands.Bot):
    await bot.add_cog(AdminRole(bot))
