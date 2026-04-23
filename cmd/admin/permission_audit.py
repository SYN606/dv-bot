import discord
from discord.ext import commands
from discord import app_commands

from utils.permissions.base_admin import BaseAdminCog
from utils.core.embeds import make_embed

DANGEROUS_PERMS = {
    "administrator": ("Administrator", 5),
    "manage_guild": ("Manage Server", 4),
    "manage_roles": ("Manage Roles", 4),
    "manage_channels": ("Manage Channels", 3),
    "kick_members": ("Kick Members", 3),
    "ban_members": ("Ban Members", 3),
    "manage_webhooks": ("Manage Webhooks", 2),
    "manage_messages": ("Manage Messages", 2),
    "mention_everyone": ("Mention Everyone", 1),
}


class PermissionAudit(BaseAdminCog):

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    # =====================================================
    # INTERNAL ANALYZER
    # =====================================================
    def _analyze_member(self, member: discord.Member):

        perms = member.guild_permissions

        dangerous = []
        severity_score = 0

        for key, (label, severity) in DANGEROUS_PERMS.items():
            if getattr(perms, key, False):
                dangerous.append(label)
                severity_score += severity

        if not dangerous:
            return None

        role_sources = []
        direct = []

        for key in DANGEROUS_PERMS:
            if getattr(perms, key, False):
                found = False

                for role in member.roles:
                    if getattr(role.permissions, key, False):
                        role_sources.append(role.name)
                        found = True

                if not found:
                    direct.append(key)

        return {
            "member": member,
            "perms": dangerous,
            "severity": severity_score,
            "roles": list(set(role_sources)),
            "direct": bool(direct),
        }

    # =====================================================
    # SERVER SCAN
    # =====================================================
    @app_commands.command(
        name="perm-scan",
        description="Scan server for dangerous permissions",
    )
    async def perm_scan(self, interaction: discord.Interaction):

        guild = interaction.guild
        if guild is None:
            return

        await interaction.response.defer(ephemeral=True)

        flagged = []

        for member in guild.members:
            if member.bot:
                continue

            data = self._analyze_member(member)
            if data:
                flagged.append(data)

        if not flagged:
            return await interaction.followup.send(
                embed=make_embed(
                    title="Permission Scan Complete",
                    description="No dangerous permissions detected.",
                    level="SUCCESS",
                ),
                ephemeral=True,
            )

        # SORT BY RISK
        flagged.sort(
            key=lambda x: (-x["severity"], x["member"].top_role.position))

        # BUILD REPORT
        lines = []
        for entry in flagged[:25]:
            member = entry["member"]
            perms = entry["perms"]
            roles = entry["roles"]

            role_text = ", ".join(roles) if roles else "Direct Permission"

            severity_icon = "🔴" if entry["severity"] >= 5 else "🟠"

            lines.append(f"{severity_icon} **{member}**\n"
                         f"Roles: {role_text}\n"
                         f"{', '.join(perms)}")

        description = "\n\n".join(lines)

        if len(flagged) > 25:
            description += f"\n\n...and {len(flagged) - 25} more users."

        # SUMMARY
        high = sum(1 for x in flagged if x["severity"] >= 5)
        medium = sum(1 for x in flagged if 3 <= x["severity"] < 5)

        embed = make_embed(
            title="Permission Scan Report",
            description=description,
            level="WARNING",
            footer=f"Total: {len(flagged)} • High: {high} • Medium: {medium}",
        )

        await interaction.followup.send(embed=embed, ephemeral=True)

    # =====================================================
    # SINGLE USER CHECK
    # =====================================================
    @app_commands.command(
        name="perm-check",
        description="Audit a member's dangerous permissions",
    )
    async def perm_check(self, interaction: discord.Interaction,
                         member: discord.Member):

        data = self._analyze_member(member)

        if not data:
            embed = make_embed(
                title="Permission Inspection",
                description=f"**{member}** has no dangerous permissions.",
                level="SUCCESS",
            )
            return await interaction.response.send_message(embed=embed,
                                                           ephemeral=True)

        severity_icon = "🔴" if data["severity"] >= 5 else "🟠"

        embed = make_embed(
            title="Permission Inspection",
            description=(f"{severity_icon} **{member}**\n\n"
                         f"Roles: {', '.join(data['roles']) or 'Direct'}\n\n" +
                         "\n".join(f"• {p}" for p in data["perms"])),
            level="WARNING",
        )

        await interaction.response.send_message(embed=embed, ephemeral=True)


async def setup(bot: commands.Bot):
    await bot.add_cog(PermissionAudit(bot))
