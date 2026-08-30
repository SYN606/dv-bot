from __future__ import annotations

import discord
from discord import app_commands
from discord.ext import commands

from db.db_helpers.analytics import (
    add_role_restriction,
    get_autorole_config,
    get_role_restrictions,
    remove_role_restriction,
    update_auto_role_config,
)
from db.models import FeatureModule, RestrictionScope
from utils.core.embeds import make_embed
from utils.permissions.base_admin import BaseAdminCog


class AutoRoleSetup(BaseAdminCog):
    """Admin configuration for weekly top chatters/VC auto-role rewards and blacklists."""

    def __init__(self, bot: commands.Bot) -> None:
        self.bot = bot

    autorole_group = app_commands.Group(
        name="autorole",
        description=
        "Configure automated leaderboard reward roles and blacklists.",
    )

    @autorole_group.command(
        name="setup",
        description=
        "Configure weekly top 3 text/VC reward roles & announcement channel.",
    )
    @app_commands.checks.has_permissions(administrator=True)
    async def setup_auto_roles(
        self,
        interaction: discord.Interaction,
        announcement_channel: discord.TextChannel | None = None,
        top1_chat: discord.Role | None = None,
        top2_chat: discord.Role | None = None,
        top3_chat: discord.Role | None = None,
        top1_vc: discord.Role | None = None,
        top2_vc: discord.Role | None = None,
        top3_vc: discord.Role | None = None,
    ) -> None:
        if not interaction.guild:
            return
        await interaction.response.defer()

        guild_id = interaction.guild.id
        updates = {}

        if announcement_channel:
            updates["announcement_channel_id"] = announcement_channel.id
        if top1_chat:
            updates["top_chat_role_1"] = top1_chat.id
        if top2_chat:
            updates["top_chat_role_2"] = top2_chat.id
        if top3_chat:
            updates["top_chat_role_3"] = top3_chat.id
        if top1_vc:
            updates["top_vc_role_1"] = top1_vc.id
        if top2_vc:
            updates["top_vc_role_2"] = top2_vc.id
        if top3_vc:
            updates["top_vc_role_3"] = top3_vc.id

        await update_auto_role_config(guild_id=guild_id, **updates)

        embed = make_embed(
            title="Auto-Role Config Updated",
            description=
            ("Leaderboard reward bindings updated successfully.\n\n"
             f"**Announcement Channel:** {announcement_channel.mention if announcement_channel else 'Unchanged'}"
             ),
            level="SUCCESS",
            use_emoji=True,
        )
        await interaction.followup.send(embed=embed)

    @autorole_group.command(
        name="blacklist_add",
        description=
        "Blacklist a role from earning weekly leaderboard auto-roles.",
    )
    @app_commands.checks.has_permissions(administrator=True)
    async def blacklist_add(self, interaction: discord.Interaction,
                            role: discord.Role) -> None:
        if not interaction.guild:
            return
        await interaction.response.defer()

        added = await add_role_restriction(
            guild_id=interaction.guild.id,
            role_id=role.id,
            feature=FeatureModule.AUTO_ROLE,
            restriction_type=RestrictionScope.DENY,
        )
        if added:
            embed = make_embed(
                title="Role Blacklisted",
                description=
                f"{role.mention} will now be excluded from auto-role rewards.",
                level="SUCCESS",
            )
        else:
            embed = make_embed(
                title="Already Blacklisted",
                description=f"{role.mention} is already in the blacklist.",
                level="WARNING",
            )

        await interaction.followup.send(embed=embed)

    @autorole_group.command(
        name="blacklist_remove",
        description="Remove a role from the weekly reward blacklist.",
    )
    @app_commands.checks.has_permissions(administrator=True)
    async def blacklist_remove(self, interaction: discord.Interaction,
                               role: discord.Role) -> None:
        if not interaction.guild:
            return
        await interaction.response.defer()

        removed = await remove_role_restriction(
            guild_id=interaction.guild.id,
            role_id=role.id,
            feature=FeatureModule.AUTO_ROLE,
            restriction_type=RestrictionScope.DENY,
        )
        if removed:
            embed = make_embed(
                title="Role Removed",
                description=
                f"{role.mention} can now participate in auto-role rewards.",
                level="SUCCESS",
            )
        else:
            embed = make_embed(
                title="Not Found",
                description=f"{role.mention} was not present in the blacklist.",
                level="WARNING",
            )

        await interaction.followup.send(embed=embed)

    @autorole_group.command(
        name="blacklist_list",
        description="View all roles currently excluded from weekly auto-roles.",
    )
    @app_commands.checks.has_permissions(administrator=True)
    async def blacklist_list(self, interaction: discord.Interaction) -> None:
        if not interaction.guild:
            return
        await interaction.response.defer()

        role_ids = await get_role_restrictions(
            guild_id=interaction.guild.id,
            feature=FeatureModule.AUTO_ROLE,
            restriction_type=RestrictionScope.DENY,
        )
        if not role_ids:
            embed = make_embed(
                title="Blacklisted Roles",
                description="No roles are currently blacklisted.",
                level="INFO",
            )
        else:
            role_mentions = [f"<@&{rid}>" for rid in role_ids]
            embed = make_embed(
                title="Blacklisted Roles",
                description="\n".join(role_mentions),
                level="INFO",
            )

        await interaction.followup.send(embed=embed)


async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(AutoRoleSetup(bot))
