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

        roles_to_check = [
            top1_chat, top2_chat, top3_chat, top1_vc, top2_vc, top3_vc
        ]
        provided_roles = [r for r in roles_to_check if r is not None]

        if not announcement_channel and not provided_roles:
            embed = make_embed(
                title="No Parameters Provided",
                description=
                "Please provide at least one channel or role parameter to update configuration.",
                level="WARNING",
            )
            await interaction.followup.send(embed=embed)
            return

        bot_member = interaction.guild.me
        if provided_roles and bot_member:
            unassignable = [
                r for r in provided_roles
                if r >= bot_member.top_role or r.managed
            ]
            if unassignable:
                mentions = ", ".join(r.mention for r in unassignable)
                embed = make_embed(
                    title="Role Hierarchy Error",
                    description=
                    (f"The bot cannot assign the following role(s) because they are higher than "
                     f"or equal to the bot's highest role, or managed by an integration:\n{mentions}"
                     ),
                    level="ERROR",
                )
                await interaction.followup.send(embed=embed)
                return

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

        fields = [
            ("Announcement Channel", announcement_channel.mention
             if announcement_channel else "Unchanged", True),
            ("Text Rewards (Top 1-3)",
             f"{top1_chat.mention if top1_chat else 'Unchanged'} | {top2_chat.mention if top2_chat else 'Unchanged'} | {top3_chat.mention if top3_chat else 'Unchanged'}",
             False),
            ("VC Rewards (Top 1-3)",
             f"{top1_vc.mention if top1_vc else 'Unchanged'} | {top2_vc.mention if top2_vc else 'Unchanged'} | {top3_vc.mention if top3_vc else 'Unchanged'}",
             False),
        ]

        embed = make_embed(
            title="Auto-Role Config Updated",
            description=
            "Weekly leaderboard reward bindings updated successfully.",
            level="SUCCESS",
            fields=fields,
            use_emoji=True,
        )
        await interaction.followup.send(embed=embed)

    @autorole_group.command(
        name="view",
        description=
        "View current weekly auto-role reward bindings and configuration.",
    )
    @app_commands.checks.has_permissions(administrator=True)
    async def view_auto_roles(self, interaction: discord.Interaction) -> None:
        if not interaction.guild:
            return
        await interaction.response.defer()

        config = await get_autorole_config(interaction.guild.id)
        if not config:
            embed = make_embed(
                title="Auto-Role Config",
                description=
                "No weekly auto-role configuration has been set up for this guild.",
                level="INFO",
            )
            await interaction.followup.send(embed=embed)
            return

        def r_fmt(role_id: int | None) -> str:
            return f"<@&{role_id}>" if role_id else "`Not Set`"

        ch_fmt = f"<#{config.announcement_channel_id}>" if config.announcement_channel_id else "`Not Set`"

        fields = [
            ("Announcement Channel", ch_fmt, False),
            (
                "Text Chat Rewards",
                f"🥇 Top 1: {r_fmt(config.top_chat_role_1)}\n"
                f"🥈 Top 2: {r_fmt(config.top_chat_role_2)}\n"
                f"🥉 Top 3: {r_fmt(config.top_chat_role_3)}",
                True,
            ),
            (
                "Voice VC Rewards",
                f"🥇 Top 1: {r_fmt(config.top_vc_role_1)}\n"
                f"🥈 Top 2: {r_fmt(config.top_vc_role_2)}\n"
                f"🥉 Top 3: {r_fmt(config.top_vc_role_3)}",
                True,
            ),
        ]

        embed = make_embed(
            title=f"Weekly Auto-Role Config — {interaction.guild.name}",
            description=
            "Active weekly reward bindings and announcement target.",
            level="INFO",
            fields=fields,
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
