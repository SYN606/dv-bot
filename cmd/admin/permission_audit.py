from discord.ext import commands
from discord import app_commands
import discord

from utils.base_admin import BaseAdminCog
from utils.embeds import make_embed

DANGEROUS_PERMS = {
    "administrator": "Administrator",
    "manage_guild": "Manage Server",
    "manage_roles": "Manage Roles",
    "manage_channels": "Manage Channels",
    "kick_members": "Kick Members",
    "ban_members": "Ban Members",
    "manage_webhooks": "Manage Webhooks",
    "manage_messages": "Manage Messages",
    "mention_everyone": "Mention Everyone",
}


class PermissionAudit(BaseAdminCog):

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    # =========================================================
    # SERVER SECURITY SCAN
    # =========================================================

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

            dangerous = [
                label for key, label in DANGEROUS_PERMS.items()
                if getattr(perms, key, False)
            ]

            if dangerous:

                roles_with_perms = []

                for role in member.roles:

                    if role.is_default():
                        continue

                    role_perms = role.permissions

                    role_dangerous = [
                        label for key, label in DANGEROUS_PERMS.items()
                        if getattr(role_perms, key, False)
                    ]

                    if role_dangerous:
                        roles_with_perms.append(role.name)

                flagged.append({
                    "member": member,
                    "perms": dangerous,
                    "roles": roles_with_perms
                })

        if not flagged:

            embed = make_embed(
                title="Permission Scan Complete",
                description="No users with dangerous permissions were found.",
                level="SUCCESS",
            )

            await interaction.followup.send(embed=embed, ephemeral=True)
            return

        # sort by risk
        flagged.sort(key=lambda x:
                     ("Administrator" not in x["perms"], -len(x["perms"])))

        pages = []
        chunk = ""

        for entry in flagged:

            member = entry["member"]
            perms = entry["perms"]
            roles = entry["roles"]

            role_text = ", ".join(roles) if roles else "Direct Permission"

            block = (f"**{member}**\n"
                     f"Roles: {role_text}\n" +
                     "\n".join(f"• {p}" for p in perms) + "\n\n")

            if len(chunk) + len(block) > 3500:
                pages.append(chunk)
                chunk = block
            else:
                chunk += block

        if chunk:
            pages.append(chunk)

        for index, page in enumerate(pages, start=1):

            embed = make_embed(
                title="Dangerous Permission Report",
                description=page,
                level="WARNING",
                footer=
                f"Page {index}/{len(pages)} • Users flagged: {len(flagged)}",
            )

            await interaction.followup.send(embed=embed, ephemeral=True)

    # =========================================================
    # INDIVIDUAL SECURITY CHECK
    # =========================================================

    @app_commands.command(
        name="perm-check",
        description="Audit dangerous permissions of a specific member.")
    async def perm_check(self, interaction: discord.Interaction,
                         member: discord.Member):

        perms = member.guild_permissions

        dangerous = [
            label for key, label in DANGEROUS_PERMS.items()
            if getattr(perms, key, False)
        ]

        roles_with_perms = []

        for role in member.roles:

            if role.is_default():
                continue

            role_perms = role.permissions

            role_dangerous = [
                label for key, label in DANGEROUS_PERMS.items()
                if getattr(role_perms, key, False)
            ]

            if role_dangerous:
                roles_with_perms.append(role.name)

        if not dangerous:

            embed = make_embed(
                title="Permission Inspection",
                description=f"**{member}** has no dangerous permissions.",
                level="SUCCESS",
            )

        else:

            role_text = ", ".join(
                roles_with_perms) if roles_with_perms else "Direct Permission"

            embed = make_embed(
                title="Permission Inspection",
                description=(f"**{member}**\n"
                             f"Roles granting permissions: {role_text}\n\n" +
                             "\n".join(f"• {p}" for p in dangerous)),
                level="WARNING",
            )

        await interaction.response.send_message(embed=embed, ephemeral=True)


async def setup(bot: commands.Bot):
    await bot.add_cog(PermissionAudit(bot))
