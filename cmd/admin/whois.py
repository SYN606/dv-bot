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

    def __init__(self, bot: commands.Bot):
        super().__init__()
        self.bot = bot

    # HELPERS
    def format_timestamp(self, dt: datetime | None) -> str:
        if dt is None:
            return "Unknown"
        unix = int(dt.timestamp())
        return f"<t:{unix}:F>\n<t:{unix}:R>"

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
    @admin_command(name="whois", aliases=["userinfo", "user", "ui"])
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
                role_text += f" (+{len(roles)-12} more)"

        if target.voice and target.voice.channel:
            voice_text = f"{target.voice.channel.mention} ({len(target.voice.channel.members)})"
        else:
            voice_text = "Not connected"

        boost_text = self.format_timestamp(
            target.premium_since) if target.premium_since else "Not boosting"
        mutuals = sum(1 for g in self.bot.guilds if g.get_member(target.id))

        embed = make_embed(
            title=f"{target}",
            description=
            f"{EMOJIS['developer']} {target.mention}\n{EMOJIS['arrow_point']} `{target.id}`",
            level="INFO")

        # Color setup
        if target.accent_color:
            embed.color = target.accent_color
        elif target.color != discord.Color.default():
            embed.color = target.color
        embed.set_thumbnail(url=target.display_avatar.url)

        if fetched_user.banner:
            embed.set_image(url=fetched_user.banner.url)

        embed.add_field(name=f"{EMOJIS['message']} User",
                        value=(f"**Display:** {target.display_name}\n"
                               f"**Global:** {target.global_name or 'None'}\n"
                               f"**Nickname:** {target.nick or 'None'}\n"
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
                               f"**Top Role:** {target.top_role.mention}\n"
                               f"**Roles:** {len(target.roles)-1}\n"
                               f"**Voice:** {voice_text}\n"
                               f"**Mutuals:** {mutuals}"),
                        inline=False)
        embed.add_field(name=f"{EMOJIS['warning']} Permissions",
                        value=self.get_permissions(target),
                        inline=False)
        embed.add_field(name=f"{EMOJIS['curved_arrow']} Activities",
                        value=self.get_activities(target),
                        inline=False)
        embed.add_field(name=f"{EMOJIS['folder']} Roles ({len(roles)})",
                        value=role_text,
                        inline=False)

        embed.set_footer(text=f"Action by : {ctx.author}",
                         icon_url=ctx.author.display_avatar.url)

        await ctx.send(embed=embed)

        try:
            await ctx.message.delete()
        except (discord.Forbidden, discord.NotFound):
            pass

    @whois.error # type: ignore
    async def whois_error(self, ctx: commands.Context,
                          error: Exception) -> None:
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
