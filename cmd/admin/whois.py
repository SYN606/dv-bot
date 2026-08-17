import asyncio
import logging
from datetime import datetime

import discord
from discord.ext import commands

from utils.core.embeds import make_embed
from utils.core.emojis import EMOJIS
from utils.permissions.base_admin import BaseAdminCog, admin_command

logger = logging.getLogger("bot")


class Whois(BaseAdminCog):
    """Cog providing comprehensive user and member lookup information."""

    def __init__(self, bot: commands.Bot) -> None:
        super().__init__()
        self.bot = bot

    def format_timestamp(self, dt: datetime | None) -> str:
        if dt is None:
            return "Unknown"
        unix = int(dt.timestamp())
        return f"<t:{unix}:F>\n<t:{unix}:R>"

    def get_permissions(self, member: discord.Member) -> str:
        if member.guild and member.id == member.guild.owner_id:
            return "Server Owner, Administrator"

        perms = member.guild_permissions

        if perms.administrator:
            return "Administrator"

        important: list[str] = []
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

    @admin_command(name="whois", aliases=["userinfo", "user", "ui"])
    @commands.guild_only()
    @commands.cooldown(1, 5, commands.BucketType.user)
    async def whois(
        self,
        ctx: commands.Context,
        member: discord.Member | None = None,
    ) -> None:
        guild = ctx.guild
        if guild is None:
            return

        target = member or ctx.author
        if not isinstance(target, discord.Member):
            return

        try:
            fetched_user = await self.bot.fetch_user(target.id)
        except Exception:
            logger.exception(
                "Failed to fetch extended user profile for Whois command")
            fetched_user = target

        sorted_members = sorted(
            guild.members,
            key=lambda m: (m.joined_at or discord.utils.utcnow()),
        )

        try:
            join_position: int | str = sorted_members.index(target) + 1
        except ValueError:
            join_position = "Unknown"

        roles = [role.mention for role in reversed(target.roles[1:])]
        if not roles:
            role_text = "None"
        else:
            role_text = ", ".join(roles[:12])
            if len(roles) > 12:
                role_text += f" (+{len(roles) - 12} more)"

        if target.voice and target.voice.channel:
            voice_text = f"{target.voice.channel.mention} ({len(target.voice.channel.members)})"
        else:
            voice_text = "Not connected"

        boost_text = (self.format_timestamp(target.premium_since)
                      if target.premium_since else "Not boosting")
        mutuals = sum(1 for g in self.bot.guilds if g.get_member(target.id))

        developer_emoji = EMOJIS.get("developer") or "👨‍💻"
        arrow_emoji = EMOJIS.get("arrow_point") or "▶"
        message_emoji = EMOJIS.get("message") or "💬"
        folder_emoji = EMOJIS.get("folder") or "📁"
        support_emoji = EMOJIS.get("support_dot") or "🔵"
        boost_emoji = EMOJIS.get("boost") or "🚀"
        mod_emoji = EMOJIS.get("moderation") or "🛡️"
        warning_emoji = EMOJIS.get("warning") or "⚠️"
        curved_arrow = EMOJIS.get("curved_arrow") or "↪"

        embed = make_embed(
            title=f"{target}",
            description=
            f"{developer_emoji} {target.mention}\n{arrow_emoji} `{target.id}`",
            level="INFO")

        if target.accent_color:
            embed.color = target.accent_color
        elif target.color != discord.Color.default():
            embed.color = target.color
        embed.set_thumbnail(url=target.display_avatar.url)

        if fetched_user.banner:
            embed.set_image(url=fetched_user.banner.url)

        embed.add_field(name=f"{message_emoji} User",
                        value=(f"**Display:** {target.display_name}\n"
                               f"**Global:** {target.global_name or 'None'}\n"
                               f"**Nickname:** {target.nick or 'None'}\n"
                               f"**Bot:** {target.bot}"),
                        inline=False)

        embed.add_field(name=f"{folder_emoji} Created",
                        value=self.format_timestamp(target.created_at),
                        inline=True)

        embed.add_field(name=f"{support_emoji} Joined",
                        value=self.format_timestamp(target.joined_at),
                        inline=True)

        embed.add_field(name=f"{boost_emoji} Boosting",
                        value=boost_text,
                        inline=True)

        embed.add_field(name=f"{mod_emoji} Server",
                        value=(f"**Join Position:** #{join_position}\n"
                               f"**Top Role:** {target.top_role.mention}\n"
                               f"**Roles:** {len(target.roles) - 1}\n"
                               f"**Voice:** {voice_text}\n"
                               f"**Mutuals:** {mutuals}"),
                        inline=False)

        embed.add_field(name=f"{warning_emoji} Permissions",
                        value=self.get_permissions(target),
                        inline=False)

        embed.add_field(name=f"{curved_arrow} Activities",
                        value=self.get_activities(target),
                        inline=False)

        embed.add_field(name=f"{folder_emoji} Roles ({len(roles)})",
                        value=role_text,
                        inline=False)

        embed.set_footer(text=f"Action by : {ctx.author}",
                         icon_url=ctx.author.display_avatar.url)

        await ctx.send(embed=embed)

        try:
            await ctx.message.delete()
        except (discord.Forbidden, discord.NotFound):
            pass

    async def cog_command_error(self, ctx: commands.Context,
                                error: Exception) -> None:
        """Cog-wide error handler replacing method-level .error decorators."""
        if isinstance(error, commands.CheckFailure):
            embed = make_embed(
                title="Access Denied",
                description=
                "You do not have permission to execute this administrator command.",
                level="ERROR")
            error_msg = await ctx.send(embed=embed)

            await asyncio.sleep(5)
            try:
                await ctx.message.delete()
            except (discord.Forbidden, discord.NotFound):
                pass
            try:
                await error_msg.delete()
            except (discord.Forbidden, discord.NotFound):
                pass


async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(Whois(bot))
