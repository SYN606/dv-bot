import discord
from discord.ext import commands

from utils.permissions.base_admin import BaseAdminCog
from utils.core.embeds import make_embed
from utils.core.emojis import EMOJIS


class Whois(BaseAdminCog):
    """
    Dyno-style user lookup command.
    Fast (cache-only) and admin protected via BaseAdminCog.
    """

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @commands.command(
        name="whois",
        help="Show detailed information about a user",
    )
    async def whois(
        self,
        ctx: commands.Context,
        target: str | None = None,
    ):

        if ctx.guild is None:
            return

        member: discord.Member | None = None

        # ─────────────────────────
        # REPLY SUPPORT
        # ─────────────────────────
        if ctx.message.reference:
            try:
                ref = await ctx.channel.fetch_message(ctx.message.reference.message_id)
                if isinstance(ref.author, discord.Member):
                    member = ref.author
            except Exception:
                pass

        # USER ID SUPPORT
        if not member and target and target.isdigit():
            member = ctx.guild.get_member(int(target))

        # MENTION SUPPORT
        if not member and ctx.message.mentions:
            m = ctx.message.mentions[0]
            if isinstance(m, discord.Member):
                member = m

        # DEFAULT → SELF
        if not member:
            member = ctx.author

        guild = ctx.guild

        created_ts = int(member.created_at.timestamp())
        joined_ts = int(member.joined_at.timestamp())

        # ─────────────────────────
        # JOIN POSITION
        # ─────────────────────────
        members_sorted = sorted(
            guild.members,
            key=lambda m: m.joined_at or guild.created_at,
        )

        join_position = members_sorted.index(member) + 1

        # ─────────────────────────
        # ROLES
        # ─────────────────────────
        roles = [r for r in member.roles if r.name != "@everyone"]
        roles_mentions = [r.mention for r in roles]

        if roles_mentions:
            roles_display = ", ".join(roles_mentions[-12:])
            if len(roles_mentions) > 12:
                roles_display += f" +{len(roles_mentions) - 12} more"
        else:
            roles_display = "None"

        # ─────────────────────────
        # STATUS FLAGS
        # ─────────────────────────
        boosting = (
            f"{EMOJIS['boost']} Boosting (<t:{int(member.premium_since.timestamp())}:R>)"
            if member.premium_since
            else f"{EMOJIS['red_dot']} Not Boosting"
        )

        admin_status = (
            f"{EMOJIS['green_dot']} Administrator"
            if member.guild_permissions.administrator
            else f"{EMOJIS['red_dot']} Standard Permissions"
        )

        account_type = (
            f"{EMOJIS['developer']} Bot" if member.bot else f"{EMOJIS['okay']} User"
        )

        # ─────────────────────────
        # EMBED FIELDS
        # ─────────────────────────
        fields = [
            (
                f"{EMOJIS['announcement']} Account Information",
                (
                    f"**Username:** {member}\n"
                    f"**User ID:** `{member.id}`\n"
                    f"**Type:** {account_type}\n"
                    f"**Created:** <t:{created_ts}:F>\n"
                    f"**Account Age:** <t:{created_ts}:R>"
                ),
                False,
            ),
            (
                f"{EMOJIS['moderation']} Server Information",
                (
                    f"**Nickname:** {member.nick or 'None'}\n"
                    f"**Joined:** <t:{joined_ts}:F>\n"
                    f"**Join Position:** `{join_position}/{guild.member_count}`\n"
                    f"**Top Role:** {member.top_role.mention}"
                ),
                False,
            ),
            (
                f"{EMOJIS['boost']} Member Status",
                (f"**Boost:** {boosting}\n**Permissions:** {admin_status}"),
                False,
            ),
            (
                f"{EMOJIS['pants']} Roles ({len(roles_mentions)})",
                roles_display,
                False,
            ),
        ]

        if guild.vanity_url_code:
            fields.append(
                (
                    f"{EMOJIS['github']} Vanity Invite",
                    f"https://discord.gg/{guild.vanity_url_code}",
                    False,
                )
            )

        embed = make_embed(
            title="User Lookup",
            description=f"{EMOJIS['ping']} Information for {member.mention}",
            level="INFO",
            fields=fields,
            thumbnail=member.display_avatar.url,
            footer=f"Requested by {ctx.author} • ID: {member.id}",
        )

        await ctx.send(embed=embed)

        # Delete invoking message quietly
        try:
            ctx.bot.loop.create_task(ctx.message.delete())
        except Exception:
            pass


async def setup(bot: commands.Bot):
    await bot.add_cog(Whois(bot))
