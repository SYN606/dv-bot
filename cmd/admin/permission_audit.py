import discord
from discord.ext import commands
from discord import app_commands
from typing import Union
from utils.permissions.base_admin import BaseAdminCog
from utils.permissions.check_perms import is_bot_admin
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
    "create_instant_invite": ("Create Invite", "green"),
}

EmojiType = Union[str, discord.PartialEmoji]


class PermissionAudit(BaseAdminCog):
    def __init__(self, bot: commands.Bot):
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

    def get_permission_emoji(self, level: str) -> EmojiType:
        if level == "red":
            return EMOJIS.get("red_dot", "🔴")
        if level == "yellow":
            return EMOJIS.get("warning", "⚠️")
        return EMOJIS.get("green_dot", "🟢")

    def _analyze_member(self, member: discord.Member) -> list[dict]:
        # PERMISSIONS is now accessed globally from this file
        perms = member.guild_permissions
        found = []
        for key, (label, level) in PERMISSIONS.items():
            if getattr(perms, key, False):
                sources = [
                    r.mention
                    for r in member.roles
                    if getattr(r.permissions, key, False)
                ]
                found.append(
                    {
                        "permission": label,
                        "level": level,
                        "roles": sources if sources else ["Direct Permission"],
                    }
                )
        return found

    @app_commands.command(name="perm-check", description="Audit a member's permissions")
    async def perm_check(
        self, interaction: discord.Interaction, member: discord.Member
    ):
        if not await self.has_permission_audit_access(interaction):
            return await interaction.response.send_message(
                embed=make_embed(
                    title="Access Denied",
                    description="Requires Senior Moderator status.",
                    level="ERROR",
                ),
                ephemeral=True,
            )

        data = self._analyze_member(member)
        if not data:
            return await interaction.response.send_message(
                embed=make_embed(
                    title="Clean Audit",
                    description=f"{member.display_name} has no flagged permissions.",
                    level="SUCCESS",
                ),
                ephemeral=True,
            )

        embed = make_embed(
            title=f"Audit: {member.display_name}",
            description=f"Flagged {len(data)} permissions.",
            level="WARNING",
        )
        groups = {"red": [], "yellow": [], "green": []}
        for p in data:
            emoji = self.get_permission_emoji(p["level"])
            roles = " • ".join(p["roles"][:2])
            if len(p["roles"]) > 2:
                roles += "..."
            groups[p["level"]].append(f"{emoji} **{p['permission']}**\n└ `{roles}`")

        for level, lines in groups.items():
            if lines:
                embed.add_field(
                    name=f"{level.upper()} RISK", value="\n".join(lines), inline=False
                )

        embed.set_thumbnail(url=member.display_avatar.url)
        embed.set_footer(text=f"User ID: {member.id}")
        await interaction.response.send_message(embed=embed, ephemeral=True)

    @app_commands.command(
        name="perm-scan", description="Scan server for permissioned users"
    )
    async def perm_scan(self, interaction: discord.Interaction):
        if not await self.has_permission_audit_access(interaction):
            return await interaction.response.send_message(
                embed=make_embed(title="Access Denied", level="ERROR"), ephemeral=True
            )

        await interaction.response.defer(ephemeral=True)
        results = []
        for member in interaction.guild.members: # type: ignore
            if member.bot:
                continue
            data = self._analyze_member(member)
            if data:
                red = sum(1 for x in data if x["level"] == "red")
                yellow = sum(1 for x in data if x["level"] == "yellow")
                results.append((red, yellow, member.display_name))

        results.sort(key=lambda x: (x[0], x[1]), reverse=True)
        desc = "\n".join([f"**{r[2]}** | 🔴`{r[0]}` ⚠️`{r[1]}`" for r in results[:20]])
        embed = make_embed(
            title="Permission Scan Summary",
            description=desc or "No members found.",
            level="WARNING",
        )
        await interaction.followup.send(embed=embed, ephemeral=True)


async def setup(bot: commands.Bot):
    await bot.add_cog(PermissionAudit(bot))
