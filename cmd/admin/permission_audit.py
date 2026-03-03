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
    # SERVER WIDE SCAN
    # =========================================================

    @app_commands.command(
        name="perm-scan",
        description="List members that have dangerous permissions.")
    async def perm_scan(self, interaction: discord.Interaction):

        await interaction.response.defer(ephemeral=True)

        guild = interaction.guild
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
                flagged.append((member, dangerous))

        if not flagged:
            return await interaction.followup.send(
                embed=make_embed(
                    title="Permission Scan Complete",
                    description=
                    "No users with dangerous permissions were found.",
                    level="SUCCESS",
                ),
                ephemeral=True,
            )

        # Sort: Administrator first, then by number of perms descending
        flagged.sort(key=lambda x: ("Administrator" not in x[1], -len(x[1])))

        pages = []
        current_chunk = ""

        for member, perms in flagged:
            block = (f"**{member}**\n" + "\n".join(f"• {p}"
                                                   for p in perms) + "\n\n")

            if len(current_chunk) + len(block) > 3500:
                pages.append(current_chunk)
                current_chunk = block
            else:
                current_chunk += block

        if current_chunk:
            pages.append(current_chunk)

        for index, page in enumerate(pages, start=1):

            embed = make_embed(
                title="Dangerous Permission Report",
                description=page,
                level="WARNING",
                footer=
                f"Page {index}/{len(pages)} • Total flagged users: {len(flagged)}",
            )

            await interaction.followup.send(embed=embed, ephemeral=True)

    # =========================================================
    # INDIVIDUAL CHECK
    # =========================================================

    @app_commands.command(
        name="perm-check",
        description="Check dangerous permissions of a specific member.")
    async def perm_check(self, interaction: discord.Interaction,
                         member: discord.Member):

        perms = member.guild_permissions

        dangerous = [
            label for key, label in DANGEROUS_PERMS.items()
            if getattr(perms, key, False)
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
                description=(f"**{member}**\n\n" +
                             "\n".join(f"• {p}" for p in dangerous)),
                level="WARNING",
            )

        await interaction.response.send_message(embed=embed, ephemeral=True)


async def setup(bot: commands.Bot):
    await bot.add_cog(PermissionAudit(bot))
