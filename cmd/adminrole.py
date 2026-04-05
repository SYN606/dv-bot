import asyncio
import discord
from discord.ext import commands
from discord import app_commands

from utils.permissions.base_admin import BaseAdminCog
from utils.core.embeds import make_embed
from utils.core.emojis import EMOJIS

from db.db_helpers.admin_roles import (
    add_admin_role,
    remove_admin_role,
    get_admin_roles,
)


class AdminRole(BaseAdminCog):

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    # =====================================================
    # GROUP
    # =====================================================
    adminrole = app_commands.Group(
        name="adminrole",
        description="Manage bot admin roles (Owner only)",
    )

    # =====================================================
    # COMMON VALIDATION
    # =====================================================
    async def _validate(
        self,
        interaction: discord.Interaction,
    ) -> tuple[discord.Guild, discord.Member] | None:

        guild = interaction.guild
        user = interaction.user

        if guild is None or not isinstance(user, discord.Member):
            await interaction.response.send_message(
                "Invalid context.",
                ephemeral=True,
            )
            return None

        if user.id != guild.owner_id:
            await interaction.response.send_message(
                "Only server owner can use this.",
                ephemeral=True,
            )
            return None

        return guild, user

    # =====================================================
    # ADD ROLE
    # =====================================================
    @adminrole.command(name="add", description="Add an admin role")
    async def add(
        self,
        interaction: discord.Interaction,
        role: discord.Role,
    ):
        validated = await self._validate(interaction)
        if not validated:
            return

        guild, user = validated

        # -------------------------------------------------
        # VALIDATION
        # -------------------------------------------------
        if role.is_default():
            await interaction.response.send_message(
                "Cannot use @everyone.",
                ephemeral=True,
            )
            return

        if role.managed:
            await interaction.response.send_message(
                "Cannot use bot/integration roles.",
                ephemeral=True,
            )
            return

        bot_member = guild.me

        if bot_member:
            if not bot_member.guild_permissions.manage_roles:
                await interaction.response.send_message(
                    "I need Manage Roles permission.",
                    ephemeral=True,
                )
                return

            if role >= bot_member.top_role:
                await interaction.response.send_message(
                    "My role is too low to manage this role.",
                    ephemeral=True,
                )
                return

        if role >= user.top_role:
            await interaction.response.send_message(
                "You cannot configure roles higher than your own.",
                ephemeral=True,
            )
            return

        # -------------------------------------------------
        # DB ACTION
        # -------------------------------------------------
        added = await add_admin_role(guild.id, role.id)

        await interaction.response.send_message(
            embed=make_embed(
                title="Admin Role Added",
                description=(f"{EMOJIS['success']} {role.mention} added."
                             if added else
                             f"{EMOJIS['warning']} Already configured."),
                level="SUCCESS" if added else "WARNING",
            ),
            ephemeral=True,
        )

    # =====================================================
    # REMOVE ROLE
    # =====================================================
    @adminrole.command(name="remove", description="Remove an admin role")
    async def remove(
        self,
        interaction: discord.Interaction,
        role: discord.Role,
    ):
        validated = await self._validate(interaction)
        if not validated:
            return

        guild, _ = validated

        removed = await remove_admin_role(guild.id, role.id)

        await interaction.response.send_message(
            embed=make_embed(
                title="Admin Role Removed",
                description=(f"{EMOJIS['success']} {role.mention} removed."
                             if removed else
                             f"{EMOJIS['warning']} Not configured."),
                level="SUCCESS" if removed else "WARNING",
            ),
            ephemeral=True,
        )

    # =====================================================
    # LIST ROLES
    # =====================================================
    @adminrole.command(name="list", description="List admin roles")
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

        description = ("\n".join(roles) if roles else
                       f"{EMOJIS['warning']} No roles configured.")

        await interaction.response.send_message(
            embed=make_embed(
                title="Admin Roles",
                description=description,
                level="INFO",
            ),
            ephemeral=True,
        )

    # =====================================================
    # RESET ROLES
    # =====================================================
    @adminrole.command(name="reset", description="Clear all admin roles")
    async def reset(self, interaction: discord.Interaction):
        validated = await self._validate(interaction)
        if not validated:
            return

        guild, _ = validated

        role_ids = await get_admin_roles(guild.id)

        if not role_ids:
            await interaction.response.send_message(
                embed=make_embed(
                    title="Nothing to Reset",
                    description=
                    f"{EMOJIS['warning']} No admin roles configured.",
                    level="WARNING",
                ),
                ephemeral=True,
            )
            return

        # Faster removal
        await asyncio.gather(*(remove_admin_role(guild.id, role_id)
                               for role_id in role_ids))

        await interaction.response.send_message(
            embed=make_embed(
                title="Admin Roles Reset",
                description=f"{EMOJIS['success']} All admin roles cleared.",
                level="SUCCESS",
            ),
            ephemeral=True,
        )


# =====================================================
# SETUP
# =====================================================
async def setup(bot: commands.Bot):
    await bot.add_cog(AdminRole(bot))
