import discord
from discord.ext import commands
from discord import app_commands
from utils.permissions.base_admin import BaseAdminCog
from utils.permissions.check_perms import (is_bot_admin)
from utils.core.embeds import make_embed
from utils.core.emojis import EMOJIS

PERMISSIONS = {
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
    "create_instant_invite": ("Create Invite", "green")
}


class PermissionAudit(BaseAdminCog):

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    async def has_permission_audit_access(
            self, interaction: discord.Interaction) -> bool:

        guild = interaction.guild

        if guild is None:
            return False

        user = interaction.user

        if not isinstance(user, discord.Member):
            return False

        # SERVER OWNER
        if user.id == guild.owner_id:
            return True

        # SERVER ADMIN
        if (user.guild_permissions.administrator):
            return True

        # BOT ADMIN
        return await is_bot_admin(interaction)

    def get_permission_emoji(
        self,
        level: str,
    ):

        if level == "red":
            return EMOJIS["red_dot"]

        if level == "yellow":
            return EMOJIS["warning"]

        return EMOJIS["green_dot"]

    def _analyze_member(self, member: discord.Member):

        perms = member.guild_permissions

        found_permissions = []

        for key, (label, level) in PERMISSIONS.items():

            if getattr(perms, key, False):

                role_sources = []

                for role in member.roles:

                    if getattr(role.permissions, key, False):

                        role_sources.append(role.mention)

                found_permissions.append({
                    "permission":
                    label,
                    "level":
                    level,
                    "roles":
                    (role_sources if role_sources else ["Direct Permission"])
                })

        return found_permissions

    @app_commands.command(name="perm-check",
                          description="Check member permissions")
    async def perm_check(self, interaction: discord.Interaction,
                         member: discord.Member):

        # PERMISSION CHECK
        if not await self.has_permission_audit_access(interaction):

            return await interaction.response.send_message(embed=make_embed(
                title="Permission Denied",
                description=(f"{EMOJIS['fail']} "
                             "You do not have permission "
                             "to use this command."),
                level="ERROR"),
                                                           ephemeral=True)

        permissions = self._analyze_member(member)

        if not permissions:

            embed = make_embed(title="Permission Inspection",
                               description=(f"{EMOJIS['success']} "
                                            f"**{member.display_name}** "
                                            f"has no important permissions."),
                               level="SUCCESS")

            embed.set_thumbnail(url=member.display_avatar.url)

            return await interaction.response.send_message(embed=embed,
                                                           ephemeral=True)

        red_count = sum(1 for x in permissions if x["level"] == "red")
        yellow_count = sum(1 for x in permissions if x["level"] == "yellow")
        green_count = sum(1 for x in permissions if x["level"] == "green")
        permission_lines = []
        for entry in permissions:
            unique_roles = []
            for role in entry["roles"]:
                if role not in unique_roles:
                    unique_roles.append(role)
            role_text = " • ".join(unique_roles[:2])
            if len(unique_roles) > 2:
                role_text += "..."
            permission_lines.append(
                (f"{self.get_permission_emoji(entry['level'])} "
                 f"**{entry['permission']}**\n"
                 f"└ {role_text}"))
        embed = make_embed(title="Permission Inspection",
                           description=(f"{EMOJIS['moderation']} "
                                        f"Permissions for "
                                        f"**{member.display_name}**"),
                           level="WARNING")
        chunks = []
        current_chunk = ""
        for line in permission_lines:
            if (len(current_chunk) + len(line) + 2) > 900:
                chunks.append(current_chunk)
                current_chunk = line
            else:
                if current_chunk:
                    current_chunk += "\n\n"
                current_chunk += line
        if current_chunk:
            chunks.append(current_chunk)
        chunks = chunks[:3]
        for index, chunk in enumerate(chunks):
            embed.add_field(
                name=(f"{EMOJIS['warning']} Permissions" if index == 0 else
                      (f"{EMOJIS['warning']} "
                       f"Permissions Cont.")),
                value=chunk,
                inline=False)
        embed.add_field(name=(f"{EMOJIS['folder']} Summary"),
                        value=(f"{EMOJIS['red_dot']} "
                               f"Critical: `{red_count}`\n"
                               f"{EMOJIS['warning']} "
                               f"Moderate: `{yellow_count}`\n"
                               f"{EMOJIS['green_dot']} "
                               f"Low Risk: `{green_count}`"),
                        inline=False)
        embed.set_thumbnail(url=member.display_avatar.url, )
        embed.set_footer(text=f"ID: {member.id}", )
        await interaction.response.send_message(embed=embed, ephemeral=True)

    @app_commands.command(name="perm-scan",
                          description="Scan server permissions")
    async def perm_scan(self, interaction: discord.Interaction):

        # PERMISSION CHECK
        if not await self.has_permission_audit_access(interaction):

            return await interaction.response.send_message(embed=make_embed(
                title="Permission Denied",
                description=(f"{EMOJIS['fail']} "
                             "You do not have permission "
                             "to use this command."),
                level="ERROR"),
                                                           ephemeral=True)
        guild = interaction.guild
        if guild is None:
            return
        await interaction.response.defer(ephemeral=True)
        results = []
        for member in guild.members:
            if member.bot:
                continue
            permissions = self._analyze_member(member)
            if not permissions:
                continue
            red_count = sum(1 for x in permissions if x["level"] == "red")
            yellow_count = sum(1 for x in permissions
                               if x["level"] == "yellow")
            green_count = sum(1 for x in permissions if x["level"] == "green")
            preview = " • ".join([(f"{self.get_permission_emoji(x['level'])} "
                                   f"{x['permission']}")
                                  for x in permissions[:3]])
            if len(permissions) > 3:
                preview += "..."
            role_names = []
            for entry in permissions:
                for role in entry["roles"]:
                    if role not in role_names:
                        role_names.append(role)
            role_preview = " • ".join(role_names[:2])
            if len(role_names) > 2:
                role_preview += "..."
            results.append((red_count, yellow_count,
                            (f"{EMOJIS['arrow_point']} "
                             f"**{member.display_name}**\n"
                             f"└ Roles: {role_preview}\n"
                             f"└ {preview}\n"
                             f"└ "
                             f"{EMOJIS['red_dot']} `{red_count}` "
                             f"{EMOJIS['warning']} `{yellow_count}` "
                             f"{EMOJIS['green_dot']} `{green_count}`")))
        if not results:
            embed = make_embed(
                title="Permission Scan",
                description=(f"{EMOJIS['success']} "
                             f"No important permissions found."),
                level="SUCCESS")

            return await interaction.followup.send(embed=embed, ephemeral=True)

        results.sort(key=lambda x: (x[0], x[1]), reverse=True)
        description = "\n\n".join([x[2] for x in results[:20]])
        if len(results) > 20:
            description += (f"\n\n"
                            f"{EMOJIS['arrow_white']} "
                            f"And **{len(results) - 20}** more users.")
        if len(description) > 3500:
            description = (description[:3500] + "\n\n...")
        embed = make_embed(title="Permission Scan",
                           description=description,
                           level="WARNING")
        embed.set_footer(text=(f"Users With Permissions: "
                               f"{len(results)}"))
        if guild.icon:
            embed.set_thumbnail(url=guild.icon.url, )
        await interaction.followup.send(embed=embed, ephemeral=True)


async def setup(bot: commands.Bot):
    await bot.add_cog(PermissionAudit(bot))
