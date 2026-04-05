import discord
from discord.ext import commands
from datetime import datetime
import time

from utils.permissions.base_admin import BaseAdminCog
from utils.core.embeds import make_embed
from utils.core.emojis import EMOJIS

# =====================================================
# CACHE
# =====================================================
_whois_cache: dict[int, tuple[float, discord.Embed]] = {}
CACHE_TTL = 10  # seconds

DANGEROUS_PERMS = {
    "administrator": "Administrator",
    "manage_guild": "Manage Server",
    "manage_roles": "Manage Roles",
    "manage_channels": "Manage Channels",
    "kick_members": "Kick Members",
    "ban_members": "Ban Members",
}


class Whois(BaseAdminCog):

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    # =====================================================
    # COMMAND
    # =====================================================
    @commands.command(name="whois",
                      help="Show detailed information about a user")
    @commands.dynamic_cooldown(
        lambda ctx: None if isinstance(ctx.author, discord.Member) and ctx.
        author.guild_permissions.manage_guild else commands.Cooldown(1, 5),
        commands.BucketType.user,
    )
    async def whois(self, ctx: commands.Context, target: str | None = None):

        if ctx.guild is None:
            return

        guild = ctx.guild

        # =====================================================
        # RESOLVE MEMBER
        # =====================================================
        member: discord.Member | None = None

        if ctx.message.reference:
            try:
                ref = await ctx.channel.fetch_message(
                    ctx.message.reference.message_id) # type: ignore
                if isinstance(ref.author, discord.Member):
                    member = ref.author
            except Exception:
                pass

        if not member and target and target.isdigit():
            member = guild.get_member(int(target))

        if not member and ctx.message.mentions:
            m = ctx.message.mentions[0]
            if isinstance(m, discord.Member):
                member = m

        if not member and isinstance(ctx.author, discord.Member):
            member = ctx.author

        if not member:
            return await ctx.send("User not found.")

        # =====================================================
        # CACHE CHECK
        # =====================================================
        cache_key = member.id
        now = time.time()

        cached = _whois_cache.get(cache_key)
        if cached:
            ts, embed = cached
            if now - ts < CACHE_TTL:
                return await ctx.send(embed=embed)

        # =====================================================
        # BASIC INFO
        # =====================================================
        created_ts = int(member.created_at.timestamp())
        joined_ts = int(
            member.joined_at.timestamp()) if member.joined_at else 0

        # =====================================================
        # JOIN POSITION (OPTIMIZED)
        # =====================================================
        members = [m for m in guild.members if m.joined_at]
        members.sort(key=lambda m: m.joined_at) # type: ignore

        try:
            join_position = members.index(member) + 1
        except ValueError:
            join_position = "Unknown"

        # =====================================================
        # ROLES
        # =====================================================
        roles = [r for r in member.roles if not r.is_default()]
        roles_sorted = sorted(roles, key=lambda r: r.position, reverse=True)

        role_mentions = [r.mention for r in roles_sorted]

        roles_display = (
            " ".join(role_mentions[:10]) +
            (f" +{len(role_mentions)-10}" if len(role_mentions) > 10 else "")
        ) if role_mentions else "None"

        # =====================================================
        # PERMISSIONS
        # =====================================================
        perms = member.guild_permissions

        dangerous = [
            label for key, label in DANGEROUS_PERMS.items()
            if getattr(perms, key, False)
        ]

        dangerous_display = ", ".join(dangerous) or "None"

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
        # RISK FLAGS
        # =====================================================
        account_age_days = (discord.utils.utcnow() - member.created_at).days

        risks = []
        if account_age_days < 7:
            risks.append("New Account")

        if member.display_avatar == member.default_avatar:
            risks.append("No Avatar")

        risk_display = ", ".join(risks) or "None"

        # =====================================================
        # TIMEOUT
        # =====================================================
        timeout_status = (f"<t:{int(member.timed_out_until.timestamp())}:R>"
                          if member.timed_out_until else "No")

        # =====================================================
        # LINKS
        # =====================================================
        avatar_url = member.display_avatar.url
        banner = member.banner.url if member.banner else None

        links = f"[Avatar]({avatar_url})"
        if banner:
            links += f" • [Banner]({banner})"

        # =====================================================
        # EMBED
        # =====================================================
        embed = make_embed(
            title="User Info",
            description=f"Information for {member.mention}",
            level="INFO",
            fields=[
                ("Account", f"ID: `{member.id}`\n"
                 f"Created: <t:{created_ts}:R>", True),
                ("Server", f"Joined: <t:{joined_ts}:R>\n"
                 f"Position: {join_position}/{guild.member_count}", True),
                ("Status", f"{status}\n{activity}", True),
                ("Permissions", f"Dangerous: {dangerous_display}", True),
                ("Moderation", f"Timed Out: {timeout_status}\n"
                 f"Risk: {risk_display}", True),
                (f"Roles ({len(role_mentions)})", roles_display, False),
                ("Links", links, False),
            ],
            thumbnail=avatar_url,
            footer=f"Requested by {ctx.author}",
        )

        if banner:
            embed.set_image(url=banner)
        else:
            embed.set_image(url=avatar_url)

        # =====================================================
        # CACHE STORE
        # =====================================================
        _whois_cache[cache_key] = (now, embed)

        await ctx.send(embed=embed)

    # =====================================================
    # ERROR HANDLER
    # =====================================================
    @whois.error
    async def whois_error(self, ctx: commands.Context, error):

        if isinstance(error, commands.CommandOnCooldown):
            await ctx.send(embed=make_embed(
                title="Cooldown Active",
                description=f"Try again in {round(error.retry_after, 1)}s",
                level="WARNING",
            ))


async def setup(bot: commands.Bot):
    await bot.add_cog(Whois(bot))
