import discord
from discord.ext import commands

from utils.permissions.base_admin import BaseAdminCog
from utils.core.embeds import make_embed
from utils.core.emojis import EMOJIS


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

        member: discord.Member | None = None

        # ─────────────────────────
        # RESOLVE USER
        # ─────────────────────────

        # Reply support
        if ctx.message.reference and ctx.message.reference.message_id:
            try:
                ref = await ctx.channel.fetch_message(
                    ctx.message.reference.message_id)
                if isinstance(ref.author, discord.Member):
                    member = ref.author
            except Exception:
                pass

        # ID support
        if not member and target and target.isdigit():
            member = ctx.guild.get_member(int(target))

        # Mention support
        if not member and ctx.message.mentions:
            m = ctx.message.mentions[0]
            if isinstance(m, discord.Member):
                member = m

        # Default → self
        if not member and isinstance(ctx.author, discord.Member):
            member = ctx.author

        # FINAL TYPE SAFETY
        if not isinstance(member, discord.Member):
            return await ctx.send("User not found in this server.")

        guild = ctx.guild

        # ─────────────────────────
        # BASIC TIMESTAMPS
        # ─────────────────────────
        created_ts = int(member.created_at.timestamp())
        joined_ts = int(
            member.joined_at.timestamp()) if member.joined_at else 0

        # ─────────────────────────
        # JOIN POSITION (OPTIMIZED)
        # ─────────────────────────
        join_position = sum(1 for m in guild.members if m.joined_at and member.
                            joined_at and m.joined_at < member.joined_at) + 1

        # ─────────────────────────
        # ROLES
        # ─────────────────────────
        roles = [r for r in member.roles if r.name != "@everyone"]
        roles_mentions = [r.mention for r in roles]

        if roles_mentions:
            roles_display = " ".join(roles_mentions[-10:])
            if len(roles_mentions) > 10:
                roles_display += f" +{len(roles_mentions) - 10}"
        else:
            roles_display = f"{EMOJIS['warning']} None"

        # ─────────────────────────
        # BADGES
        # ─────────────────────────
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

        badges_display = ", ".join(badges) if badges else "None"

        # ─────────────────────────
        # STATUS & ACTIVITY
        # ─────────────────────────
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

        # ─────────────────────────
        # PERMISSIONS
        # ─────────────────────────
        perms = [p for p, v in member.guild_permissions if v]
        perm_count = len(perms)

        admin_status = "Yes" if member.guild_permissions.administrator else "No"

        # ─────────────────────────
        # BOOST STATUS
        # ─────────────────────────
        boosting = (f"<t:{int(member.premium_since.timestamp())}:R>"
                    if member.premium_since else "No")

        # ─────────────────────────
        # LINKS
        # ─────────────────────────
        avatar = member.display_avatar.url
        banner = member.banner.url if member.banner else None

        links = f"[Avatar]({avatar})"
        if banner:
            links += f" • [Banner]({banner})"

        # ─────────────────────────
        # EMBED
        # ─────────────────────────
        fields = [

            # Account
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

            # Server
            (
                f"{EMOJIS['moderation']} Server",
                (f"**Nickname:** {member.nick or 'None'}\n"
                 f"**Joined:** <t:{joined_ts}:F>\n"
                 f"**Position:** `{join_position}/{guild.member_count}`\n"
                 f"**Top Role:** {member.top_role.mention}"),
                True,
            ),

            # Status
            (
                f"{EMOJIS['support_dot']} Status",
                (f"**Presence:** {status}\n"
                 f"**Activity:** {activity}\n"
                 f"**Boosting:** {boosting}"),
                True,
            ),

            # Permissions
            (
                f"{EMOJIS['folder']} Permissions",
                (f"**Admin:** {admin_status}\n"
                 f"**Enabled:** `{perm_count}`"),
                True,
            ),

            # Roles
            (
                f"{EMOJIS['folder']} Roles ({len(roles_mentions)})",
                roles_display,
                False,
            ),

            # Links
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

        await ctx.send(embed=embed)

        # Cleanup invoking message
        try:
            ctx.bot.loop.create_task(ctx.message.delete())
        except Exception:
            pass


async def setup(bot: commands.Bot):
    await bot.add_cog(Whois(bot))
