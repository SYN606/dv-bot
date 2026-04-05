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
    # SERVER SCAN (NO SPAM VERSION)
    # =====================================================
    @app_commands.command(
        name="perm-scan",
        description="Scan the server for dangerous permissions.")
    async def perm_scan(self, interaction: discord.Interaction):

        guild = interaction.guild
        if guild is None:
            return

        await interaction.response.defer(ephemeral=True)

        flagged = []

        for member in guild.members:
            if member.bot:
                continue

            perms = member.guild_permissions

            dangerous = [(label, severity)
                         for key, (label, severity) in DANGEROUS_PERMS.items()
                         if getattr(perms, key, False)]

            if dangerous:
                severity_score = sum(s for _, s in dangerous)

                roles_with_perms = [
                    role.name for role in member.roles
                    if not role.is_default() and any(
                        getattr(role.permissions, key, False)
                        for key in DANGEROUS_PERMS)
                ]

                flagged.append({
                    "member": member,
                    "perms": [d[0] for d in dangerous],
                    "severity": severity_score,
                    "roles": roles_with_perms,
                })

        if not flagged:
            return await interaction.followup.send(
                embed=make_embed(
                    title="Permission Scan Complete",
                    description="No dangerous permissions found.",
                    level="SUCCESS",
                ),
                ephemeral=True,
            )

        # =====================================================
        # SORT BY RISK
        # =====================================================
        flagged.sort(key=lambda x: -x["severity"])

        # =====================================================
        # BUILD SINGLE REPORT (NO SPAM)
        # =====================================================
        lines = []

        for entry in flagged[:25]:  # limit output
            member = entry["member"]
            roles = entry["roles"]
            perms = entry["perms"]

            role_text = ", ".join(roles) if roles else "Direct Permission"

            lines.append(f"**{member}**\n"
                         f"Roles: {role_text}\n" + ", ".join(perms))

        description = "\n\n".join(lines)

        if len(flagged) > 25:
            description += f"\n\n...and {len(flagged) - 25} more users."

        # =====================================================
        # SUMMARY
        # =====================================================
        high_risk = sum(1 for x in flagged if x["severity"] >= 5)

        embed = make_embed(
            title="Permission Scan Report",
            description=description,
            level="WARNING",
            footer=f"Flagged: {len(flagged)} • High Risk: {high_risk}",
        )

        await interaction.followup.send(embed=embed, ephemeral=True)

    # =====================================================
    # SINGLE USER CHECK (IMPROVED)
    # =====================================================
    @app_commands.command(
        name="perm-check",
        description="Audit dangerous permissions of a member.")
    async def perm_check(self, interaction: discord.Interaction,
                         member: discord.Member):

        perms = member.guild_permissions

        dangerous = [
            label for key, (label, _) in DANGEROUS_PERMS.items()
            if getattr(perms, key, False)
        ]

        roles_with_perms = [
            role.name for role in member.roles
            if not role.is_default() and any(
                getattr(role.permissions, key, False)
                for key in DANGEROUS_PERMS)
        ]

        if not dangerous:
            embed = make_embed(
                title="Permission Inspection",
                description=f"**{member}** has no dangerous permissions.",
                level="SUCCESS",
            )
        else:
            embed = make_embed(
                title="Permission Inspection",
                description=(
                    f"**{member}**\n"
                    f"Roles: {', '.join(roles_with_perms) or 'Direct'}\n\n" +
                    "\n".join(f"• {p}" for p in dangerous)),
                level="WARNING",
            )

        await interaction.response.send_message(embed=embed, ephemeral=True)


async def setup(bot: commands.Bot):
    await bot.add_cog(PermissionAudit(bot))
