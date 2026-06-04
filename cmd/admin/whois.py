import logging
from datetime import datetime
import discord
from discord.ext import commands
from utils.core.embeds import make_embed
from utils.core.emojis import EMOJIS

logger = logging.getLogger("bot")

BADGES = {
    "staff": "👨‍💼 Staff",
    "partner": "🤝 Partner",
    "hypesquad": "🎉 HypeSquad",
    "bug_hunter": "🐛 Bug Hunter",
    "bug_hunter_level_2": "🐞 Bug Hunter L2",
    "early_supporter": "💎 Early Supporter",
    "verified_bot_developer": "👨‍💻 Early Dev",
    "active_developer": "⚡ Active Dev",
    "discord_certified_moderator": "🛡️ Moderator",
    "verified_bot": "☑️ Verified Bot"
}


class Whois(commands.Cog):

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    # HELPERS
    def format_timestamp(self, dt: datetime | None) -> str:
        if dt is None:
            return "Unknown"
        unix = int(dt.timestamp())
        return f"<t:{unix}:F>\n<t:{unix}:R>"

    def get_status(self, member: discord.Member) -> str:

        mapping = {
            discord.Status.online: EMOJIS["green_dot"],
            discord.Status.idle: "🌙",
            discord.Status.dnd: EMOJIS["red_dot"],
            discord.Status.offline: "⚫",
            discord.Status.invisible: "⚫"
        }

        emoji = mapping.get(member.status, "⚫")

        return f"{emoji} {str(member.status).title()}"

    def get_platforms(self, member: discord.Member) -> str:
        platforms: list[str] = []

        if member.mobile_status != discord.Status.offline:
            platforms.append("📱 Mobile")

        if member.desktop_status != discord.Status.offline:
            platforms.append("🖥️ Desktop")

        if member.web_status != discord.Status.offline:
            platforms.append("🌐 Web")

        return ", ".join(platforms) if platforms else "Unknown"

    def get_badges(self, user: discord.User | discord.Member) -> str:
        flags = user.public_flags
        badges: list[str] = []
        for key, label in BADGES.items():
            if getattr(flags, key, False):
                badges.append(label)

        if user.bot:
            badges.append(f"{EMOJIS['developer']} Bot")

        if user.display_avatar.is_animated():
            badges.append(f"{EMOJIS['boost']} Nitro")
        return ", ".join(badges) if badges else "None"

    def get_permissions(self, member: discord.Member) -> str:
        perms = member.guild_permissions
        important: list[str] = []

        if perms.administrator:
            important.append("Administrator")

        if perms.manage_guild:
            important.append("Manage Server")

        if perms.manage_roles:
            important.append("Manage Roles")

        if perms.manage_channels:
            important.append("Manage Channels")

        if perms.ban_members:
            important.append("Ban Members")

        if perms.kick_members:
            important.append("Kick Members")

        return ", ".join(important[:5]) if important else "None"

    def get_activities(self, member: discord.Member) -> str:
        if not member.activities:
            return "None"
        activities: list[str] = []
        for activity in member.activities:
            if isinstance(activity, discord.CustomActivity):
                if activity.emoji and activity.name:
                    activities.append(f"{activity.emoji} {activity.name}")
                elif activity.name:
                    activities.append(activity.name)

            else:
                name = getattr(activity, "name", None)
                if name:
                    activities.append(str(name))
        return "\n".join(activities[:3]) if activities else "None"

    # COMMAND

    @commands.command(name="whois", aliases=["userinfo", "user", "ui"])
    @commands.guild_only()
    @commands.cooldown(1, 5, commands.BucketType.user)
    async def whois(self,
                    ctx: commands.Context,
                    member: discord.Member | None = None) -> None:

        guild = ctx.guild
        if guild is None:
            return
        target = member or ctx.author
        if not isinstance(target, discord.Member):
            return
        try:
            fetched_user = await self.bot.fetch_user(target.id)
        except Exception:
            fetched_user = target
        sorted_members = sorted(guild.members,
                                key=lambda m:
                                (m.joined_at or discord.utils.utcnow()))

        try:
            join_position = (sorted_members.index(target) + 1)
        except ValueError:
            join_position = "Unknown"

        roles = [role.mention for role in reversed(target.roles[1:])]
        if not roles:
            role_text = "None"
        else:
            role_text = ", ".join(roles[:12])
            if len(roles) > 12:
                role_text += (f" (+{len(roles)-12} more)")

        if target.voice and target.voice.channel:
            voice_text = (f"{target.voice.channel.mention} "
                          f"({len(target.voice.channel.members)})")

        else:
            voice_text = "Not connected"
        boost_text = (self.format_timestamp(target.premium_since)
                      if target.premium_since else "Not boosting")

        mutuals = sum(1 for g in self.bot.guilds if g.get_member(target.id))
        embed = make_embed(
            title=f"{target}",
            description=(f"{EMOJIS['developer']} {target.mention}\n"
                         f"{EMOJIS['arrow_point']} `{target.id}`"),
            level="INFO")

        # Color
        if target.accent_color:
            embed.color = target.accent_color
        elif target.color != discord.Color.default():
            embed.color = target.color
        embed.set_thumbnail(url=target.display_avatar.url)

        if fetched_user.banner:
            embed.set_image(url=fetched_user.banner.url)
        embed.add_field(name=f"{EMOJIS['message']} User",
                        value=(f"**Display:** {target.display_name}\n"
                               f"**Global:** "
                               f"{target.global_name or 'None'}\n"
                               f"**Nickname:** "
                               f"{target.nick or 'None'}\n"
                               f"**Bot:** {target.bot}"),
                        inline=False)
        embed.add_field(name=f"{EMOJIS['folder']} Created",
                        value=self.format_timestamp(target.created_at),
                        inline=True)
        embed.add_field(name=f"{EMOJIS['support_dot']} Joined",
                        value=self.format_timestamp(target.joined_at),
                        inline=True)
        embed.add_field(name=f"{EMOJIS['boost']} Boosting",
                        value=boost_text,
                        inline=True)
        embed.add_field(name=f"{EMOJIS['moderation']} Server",
                        value=(f"**Join Position:** #{join_position}\n"
                               f"**Top Role:** "
                               f"{target.top_role.mention}\n"
                               f"**Roles:** {len(target.roles)-1}\n"
                               f"**Mutuals:** {mutuals}"),
                        inline=False)
        embed.add_field(name=f"{EMOJIS['ping']} Presence",
                        value=(f"**Status:** "
                               f"{self.get_status(target)}\n"
                               f"**Platforms:** "
                               f"{self.get_platforms(target)}\n"
                               f"**Voice:** {voice_text}"),
                        inline=False)
        embed.add_field(name=f"{EMOJIS['warning']} Permissions",
                        value=self.get_permissions(target),
                        inline=False)
        embed.add_field(name=f"{EMOJIS['developer']} Badges",
                        value=self.get_badges(target),
                        inline=False)
        embed.add_field(name=f"{EMOJIS['curved_arrow']} Activities",
                        value=self.get_activities(target),
                        inline=False)
        embed.add_field(name=f"{EMOJIS['folder']} Roles ({len(roles)})",
                        value=role_text,
                        inline=False)
        embed.set_footer(text=f"Requested by {ctx.author}",
                         icon_url=ctx.author.display_avatar.url)
        try:
            await ctx.message.delete()
        except (discord.Forbidden, discord.NotFound):
            pass
        await ctx.reply(embed=embed, mention_author=False)
