from __future__ import annotations

import discord
from discord import app_commands
from discord.ext import commands

from utils.core.embeds import make_embed  # Reusing your embed builder


class RoleInfo(commands.Cog):
    """Cog for querying detailed role analytics and permissions."""

    def __init__(self, bot: commands.Bot) -> None:
        self.bot = bot

    @app_commands.command(
        name="roleinfo",
        description=
        "Get detailed statistics, member count, and permissions for a role.")
    @app_commands.describe(role="The role you want to inspect.")
    @app_commands.guild_only()
    async def role_info(self, interaction: discord.Interaction,
                        role: discord.Role) -> None:
        guild = interaction.guild
        if guild is None:
            return

        # Calculate members and human/bot breakdown
        total_members = len(role.members)
        humans = sum(1 for member in role.members if not member.bot)
        bots = total_members - humans

        # Key Role Flags
        is_hoisted = "Yes" if role.hoist else "No"
        is_mentionable = "Yes" if role.mentionable else "No"
        is_managed = "Yes (Integration/Bot)" if role.is_bot_managed(
        ) or role.managed else "No"
        position_str = f"{role.position} / {len(guild.roles) - 1}"

        # Permission analysis
        perms = role.permissions
        key_permissions: list[str] = []

        if perms.administrator:
            key_permissions.append("`Administrator` (All Permissions Granted)")
        else:
            perm_checks = [(perms.manage_guild, "Manage Server"),
                           (perms.manage_roles, "Manage Roles"),
                           (perms.manage_channels, "Manage Channels"),
                           (perms.kick_members, "Kick Members"),
                           (perms.ban_members, "Ban Members"),
                           (perms.moderate_members, "Timeout Members"),
                           (perms.manage_messages, "Manage Messages"),
                           (perms.manage_webhooks, "Manage Webhooks"),
                           (perms.mention_everyone, "Mention Everyone"),
                           (perms.view_audit_log, "View Audit Log")]
            for value, name in perm_checks:
                if value:
                    key_permissions.append(f"`{name}`")

        formatted_perms = (", ".join(key_permissions) if key_permissions else
                           "*No key administrative permissions.*")

        # Build structural Embed using your embed helper
        embed = make_embed(
            title=f"Role Information — {role.name}",
            description=f"**Mention:** {role.mention}\n**ID:** `{role.id}`",
            level="INFO",
            footer=f"Requested by {interaction.user}")

        # Apply role color to embed if available
        if role.color.value != 0:
            embed.color = role.color

        embed.add_field(name="📊 Member Overview",
                        value=(f"• **Total Members:** `{total_members}`\n"
                               f"• **Humans:** `{humans}`\n"
                               f"• **Bots:** `{bots}`"),
                        inline=True)

        embed.add_field(
            name="⚙️ Settings & Info",
            value=(f"• **Position:** `{position_str}`\n"
                   f"• **Hoisted:** `{is_hoisted}`\n"
                   f"• **Mentionable:** `{is_mentionable}`\n"
                   f"• **Managed:** `{is_managed}`\n"
                   f"• **Color Code:** `{role.color}`\n"
                   f"• **Created:** <t:{int(role.created_at.timestamp())}:R>"),
            inline=True)

        embed.add_field(name="🔐 Key Administrative Permissions",
                        value=formatted_perms,
                        inline=False)

        await interaction.response.send_message(embed=embed, ephemeral=False)


async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(RoleInfo(bot))
