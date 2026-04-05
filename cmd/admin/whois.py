import discord
from discord.ext import commands
from datetime import datetime

from utils.permissions.base_admin import BaseAdminCog
from utils.core.embeds import make_embed
from utils.core.emojis import EMOJIS

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


class Whois(BaseAdminCog):

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @commands.command(
        name="whois",
        help="Show detailed information about a user",
    )
    async def whois(self, ctx: commands.Context, target: str | None = None):

        if ctx.guild is None:
            return

        guild = ctx.guild
        member: discord.Member | None = None

        # =====================================================
        # RESOLVE USER
        # =====================================================

        # Reply
        if ctx.message.reference and ctx.message.reference.message_id:
            try:
                ref = await ctx.channel.fetch_message(
                    ctx.message.reference.message_id)
                if isinstance(ref.author, discord.Member):
                    member = ref.author
            except Exception:
                pass

        # ID
        if not member and target and target.isdigit():
            member = guild.get_member(int(target))

        # Mention
        if not member and ctx.message.mentions:
            m = ctx.message.mentions[0]
            if isinstance(m, discord.Member):
                member = m

        # Default self
        if not member and isinstance(ctx.author, discord.Member):
            member = ctx.author

        if not isinstance(member, discord.Member):
            return await ctx.send("User not found in this server.")

        # =====================================================
        # BASIC TIMES
        # =====================================================

        created_ts = int(member.created_at.timestamp())
        joined_ts = int(
            member.joined_at.timestamp()) if member.joined_at else 0

        # =====================================================
        # JOIN POSITION (SAFE)
        # =====================================================

        members_sorted = sorted(
            [m for m in guild.members if m.joined_at is not None],
            key=lambda m: m.joined_at or discord.utils.utcnow())

        try:
            join_position = members_sorted.index(member) + 1
        except ValueError:
            join_position = "Unknown"

        # =====================================================
        # ROLES (SORTED)
        # =====================================================

        roles = [r for r in member.roles if not r.is_default()]
        roles_sorted = sorted(roles, key=lambda r: r.position, reverse=True)

        roles_mentions = [r.mention for r in roles_sorted]

        if roles_mentions:
            roles_display = " ".join(roles_mentions[:10])
            if len(roles_mentions) > 10:
                roles_display += f" +{len(roles_mentions) - 10}"
        else:
            roles_display = f"{EMOJIS['warning']} None"

        # =====================================================
        # BADGES
        # =====================================================

        badges = []
        flags = member.public_flags

        if flags.hypesquad:
            badges.append("HypeSquad")
        if flags.verified_bot:
            badges.append("Verified Bot")
        if flags.early_supporter:
            badges.append("Early Supporter")
        if flags.bug_hunter:
            badges.append("Bug Hunter")

        badges_display = ", ".join(badges) or "None"

        # =====================================================
        # STATUS
        # =====================================================

        status_map = {
            discord.Status.online: "Online",
            discord.Status.idle: "Idle",
            discord.Status.dnd: "Do Not Disturb",
            discord.Status.offline: "Offline",
        }

        status = status_map.get(member.status, "Unknown")

        activity = "None"
        if member.activities:
            act = member.activities[0]
            activity = getattr(act, "name", str(act))

        # =====================================================
        # PERMISSIONS
        # =====================================================

        dangerous = [
            label for key, label in DANGEROUS_PERMS.items()
            if getattr(member.guild_permissions, key, False)
        ]

        dangerous_display = ", ".join(dangerous) or "None"

        admin_status = "Yes" if member.guild_permissions.administrator else "No"

        # =====================================================
        # TIMEOUT STATUS
        # =====================================================

        timeout_status = (f"<t:{int(member.timed_out_until.timestamp())}:R>"
                          if member.timed_out_until else "No")

        # =====================================================
        # BOOST
        # =====================================================

        boosting = (f"<t:{int(member.premium_since.timestamp())}:R>"
                    if member.premium_since else "No")

        # =====================================================
        # RISK ANALYSIS
        # =====================================================

        account_age_days = (discord.utils.utcnow() - member.created_at).days

        risks = []
        if account_age_days < 7:
            risks.append("New Account")

        if member.display_avatar == member.default_avatar:
            risks.append("No Custom Avatar")

        risk_display = ", ".join(risks) or "None"

        # =====================================================
        # LINKS
        # =====================================================

        avatar = member.display_avatar.url
        banner = member.banner.url if member.banner else None

        links = f"[Avatar]({avatar})"
        if banner:
            links += f" • [Banner]({banner})"

        # =====================================================
        # EMBED
        # =====================================================

        fields = [
            (
                f"{EMOJIS['curved_arrow']} Account",
                (f"**User:** {member}\n"
                 f"**ID:** `{member.id}`\n"
                 f"**Type:** {'Bot' if member.bot else 'User'}\n"
                 f"**Badges:** {badges_display}\n"
                 f"**Created:** <t:{created_ts}:F>\n"
                 f"**Age:** <t:{created_ts}:R>"),
                True,
            ),
            (
                f"{EMOJIS['moderation']} Server",
                (f"**Nickname:** {member.nick or 'None'}\n"
                 f"**Joined:** <t:{joined_ts}:F>\n"
                 f"**Position:** `{join_position}/{guild.member_count}`\n"
                 f"**Top Role:** {member.top_role.mention}"),
                True,
            ),
            (
                f"{EMOJIS['support_dot']} Status",
                (f"**Presence:** {status}\n"
                 f"**Activity:** {activity}\n"
                 f"**Boosting:** {boosting}"),
                True,
            ),
            (
                f"{EMOJIS['folder']} Permissions",
                (f"**Admin:** {admin_status}\n"
                 f"**Dangerous:** {dangerous_display}"),
                True,
            ),
            (
                f"{EMOJIS['moderation']} Moderation",
                (f"**Timed Out:** {timeout_status}\n"
                 f"**Risk Flags:** {risk_display}"),
                True,
            ),
            (
                f"{EMOJIS['folder']} Roles ({len(roles_mentions)})",
                roles_display,
                False,
            ),
            (
                f"{EMOJIS['github']} Links",
                links,
                False,
            ),
        ]

        embed = make_embed(
            title=f"{EMOJIS['message']} User Lookup",
            description=f"{EMOJIS['ping']} Info for {member.mention}",
            level="INFO",
            fields=fields,
            thumbnail=member.display_avatar.url,
            footer=f"Requested by {ctx.author} • ID: {member.id}",
        )

        # Show banner / avatar preview
        if banner:
            embed.set_image(url=banner)
        else:
            embed.set_image(url=avatar)

        await ctx.send(embed=embed)

        # Cleanup command
        try:
            ctx.bot.loop.create_task(ctx.message.delete())
        except Exception:
            pass


async def setup(bot: commands.Bot):
    await bot.add_cog(Whois(bot))
