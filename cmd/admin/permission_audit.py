from __future__ import annotations

from typing import Literal, cast

import discord
from discord import app_commands
from discord.ext import commands

from utils.core.embeds import make_embed
from utils.core.emojis import EMOJIS
from utils.permissions.base_admin import BaseAdminCog
from utils.permissions.check_perms import is_bot_admin
from utils.views.perm_scan_paginator import PermScanPaginator

type RiskLevel = Literal["red", "yellow", "green"]
type EmojiType = str | discord.PartialEmoji

PERMISSIONS: dict[str, tuple[str, RiskLevel]] = {
    "administrator": ("Administrator", "red"),
    "manage_roles": ("Manage Roles", "red"),
    "manage_channels": ("Manage Channels", "red"),
    "ban_members": ("Ban Members", "red"),
    "kick_members": ("Kick Members", "red"),
    "manage_webhooks": ("Manage Webhooks", "red"),
    "manage_guild": ("Manage Server", "yellow"),
    "moderate_members": ("Timeout Members", "yellow"),
    "manage_messages": ("Manage Messages", "yellow"),
    "mention_everyone": ("Mention Everyone", "yellow"),
    "manage_threads": ("Manage Threads", "yellow"),
    "manage_nicknames": ("Manage Nicknames", "yellow"),
    "move_members": ("Move Members", "yellow"),
    "mute_members": ("Mute Members", "yellow"),
    "deafen_members": ("Deafen Members", "yellow"),
    "manage_events": ("Manage Events", "green"),
    "view_audit_log": ("View Audit Log", "green"),
    "priority_speaker": ("Priority Speaker", "green"),
    "manage_emojis_and_stickers": ("Manage Emojis & Stickers", "green"),
    "manage_expressions": ("Manage Expressions", "green"),
    "create_instant_invite": ("Create Invite", "green"),
}


class PermissionAudit(BaseAdminCog):
    """Cog for auditing member guild permissions and risk ratings."""

    def __init__(self, bot: commands.Bot) -> None:
        self.bot = bot

    async def has_permission_audit_access(
        self, interaction: discord.Interaction
    ) -> bool:
        user = interaction.user
        if not isinstance(user, discord.Member) or not interaction.guild:
            return False
        if (
            user.id == interaction.guild.owner_id
            or user.guild_permissions.administrator
        ):
            return True
        if await is_bot_admin(interaction):
            return True
        if (
            user.guild_permissions.moderate_members
            and user.guild_permissions.manage_nicknames
            and user.guild_permissions.manage_messages
        ):
            return True
        return False

    def get_permission_emoji(self, level: RiskLevel) -> EmojiType:
        match level:
            case "red":
                return EMOJIS.get("red_dot") or "🔴"
            case "yellow":
                return EMOJIS.get("warning") or "⚠️"
            case _:
                return EMOJIS.get("green_dot") or "🟢"

    def _analyze_member(
        self, member: discord.Member
    ) -> list[dict[str, str | list[str]]]:
        perms = member.guild_permissions
        found: list[dict[str, str | list[str]]] = []

        for key, (label, level) in PERMISSIONS.items():
            if getattr(perms, key, False):
                sources = [
                    r.name
                    for r in member.roles
                    if getattr(r.permissions, key, False)
                ]
                found.append(
                    {
                        "permission": label,
                        "level": level,
                        "roles": sources if sources else ["Direct / Owner"],
                    }
                )
        return found

    @app_commands.command(
        name="perm-check", description="Audit a member's assigned permissions."
    )
    async def perm_check(
        self, interaction: discord.Interaction, member: discord.Member
    ) -> None:
        if not await self.has_permission_audit_access(interaction):
            await interaction.response.send_message(
                embed=make_embed(
                    title="Access Denied",
                    description=f"{EMOJIS.get('fail', '❌')} Requires Senior Moderator status.",
                    level="ERROR",
                ),
                ephemeral=True,
            )
            return

        data = self._analyze_member(member)
        if not data:
            await interaction.response.send_message(
                embed=make_embed(
                    title="Clean Audit",
                    description=(
                        f"{EMOJIS.get('success', '✅')} **{member.display_name}** "
                        "has no flagged permissions."
                    ),
                    level="SUCCESS",
                ),
                ephemeral=True,
            )
            return

        warn_icon = EMOJIS.get("warning", "⚠️")
        embed = make_embed(
            title=f"{warn_icon} Audit: {member.display_name}",
            description=f"Flagged **{len(data)}** elevated permissions.",
            level="WARNING",
        )

        groups: dict[RiskLevel, list[str]] = {"red": [], "yellow": [], "green": []}
        for p in data:
            level = cast(RiskLevel, p["level"])
            emoji = self.get_permission_emoji(level)
            roles_list = cast(list[str], p["roles"])
            roles_str = " • ".join(roles_list[:2])
            if len(roles_list) > 2:
                roles_str += "..."
            groups[level].append(f"{emoji} **{p['permission']}**\n└ Sources: `{roles_str}`")

        for level_key, lines in groups.items():
            if lines:
                lvl_emoji = self.get_permission_emoji(level_key)
                embed.add_field(
                    name=f"{lvl_emoji} {level_key.upper()} RISK",
                    value="\n".join(lines),
                    inline=False,
                )

        embed.set_thumbnail(url=member.display_avatar.url)
        embed.set_footer(text=f"User ID: {member.id}")
        await interaction.response.send_message(embed=embed, ephemeral=True)

    @app_commands.command(
        name="perm-scan", description="Scan server members for elevated permissions."
    )
    async def perm_scan(self, interaction: discord.Interaction) -> None:
        if not await self.has_permission_audit_access(interaction):
            await interaction.response.send_message(
                embed=make_embed(
                    title="Access Denied",
                    description=f"{EMOJIS.get('fail', '❌')} Requires Senior Moderator status.",
                    level="ERROR",
                ),
                ephemeral=True,
            )
            return

        await interaction.response.defer(ephemeral=True)

        guild = interaction.guild
        if not guild:
            await interaction.followup.send(
                embed=make_embed(
                    title="Command Error",
                    description=f"{EMOJIS.get('fail', '❌')} This command can only be executed within a server.",
                    level="ERROR",
                ),
                ephemeral=True,
            )
            return

        if not guild.chunked:
            await guild.chunk()

        results: list[tuple[int, int, str]] = []
        for member in guild.members:
            if member.bot:
                continue
            data = self._analyze_member(member)
            if data:
                red = sum(1 for x in data if x["level"] == "red")
                yellow = sum(1 for x in data if x["level"] == "yellow")
                results.append((red, yellow, member.display_name))

        results.sort(key=lambda x: (x[0], x[1]), reverse=True)

        paginator = PermScanPaginator(
            results=results, author=interaction.user, per_page=15
        )
        await interaction.followup.send(
            embed=paginator.create_embed(), view=paginator, ephemeral=True
        )


async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(PermissionAudit(bot))