import logging
import re
import unicodedata

import discord
from discord.ext import commands

from utils.core.embeds import make_embed
from utils.core.emojis import EMOJIS
from utils.logging.mod_log import send_mod_log
from utils.permissions.base_admin import BaseAdminCog

logger = logging.getLogger("bot")

PROFANITY_BLOCKLIST = {
    "madarchod", "bhenchod", "behenchod", "chutiya", "chut", "gaand", "gandu",
    "randi", "kutti", "kutta", "lund", "lavda", "loda", "harami"
}


class RenameSystem(BaseAdminCog):
    """Cog responsible for server member nickname management and profanity filtering."""

    COOLDOWN_RATE = 1
    COOLDOWN_PER = 5

    def __init__(self, bot: commands.Bot) -> None:
        self.bot = bot

    async def _delete_command(self, ctx: commands.Context) -> None:
        try:
            await ctx.message.delete()
        except (discord.Forbidden, discord.NotFound):
            pass

    async def _reply(self,
                     ctx: commands.Context,
                     *,
                     title: str,
                     description: str,
                     level: str,
                     show_footer: bool = True) -> discord.Message | None:
        await self._delete_command(ctx)

        embed = make_embed(title=title, description=description, level=level)

        if show_footer:
            embed.set_footer(text=f"Action by : {ctx.author}",
                             icon_url=ctx.author.display_avatar.url)

        return await ctx.channel.send(embed=embed)

    async def cog_check(self, ctx: commands.Context) -> bool:
        if ctx.guild is None:
            return True
        if not isinstance(ctx.author, discord.Member):
            return False
        if ctx.author.id == ctx.guild.owner_id:
            return True

        perms = ctx.author.guild_permissions
        if perms.administrator or perms.manage_nicknames:
            return True

        return await super().cog_check(ctx)

    def _normalize(self, text: str) -> str:
        return unicodedata.normalize("NFKC", text)

    def _clean_text(self, text: str) -> str:
        return "".join(c for c in text.lower() if c.isalnum())

    def _contains_profanity(self, text: str) -> bool:
        clean = self._clean_text(text)
        return any(word in clean for word in PROFANITY_BLOCKLIST)

    def _bot_can_modify(self, guild: discord.Guild,
                        target: discord.Member) -> bool:
        if self.bot.user is None:
            return False

        bot_member = guild.get_member(self.bot.user.id)
        if not bot_member:
            return False

        return (bot_member.guild_permissions.manage_nicknames
                and target != guild.owner
                and target.top_role < bot_member.top_role)

    def _moderator_can_modify(self, guild: discord.Guild,
                              moderator: discord.Member,
                              target: discord.Member) -> bool:
        if moderator.id == guild.owner_id:
            return True
        if target == guild.owner:
            return False
        if target == moderator:
            return True

        return target.top_role < moderator.top_role

    @commands.command(name="rename", aliases=["nick", "setnick"])
    @commands.guild_only()
    @commands.cooldown(COOLDOWN_RATE, COOLDOWN_PER, commands.BucketType.user)
    async def rename(self,
                     ctx: commands.Context,
                     *,
                     args: str | None = None) -> None:
        guild = ctx.guild
        if guild is None:
            return

        if not isinstance(ctx.author, discord.Member):
            return

        moderator: discord.Member = ctx.author
        prefix = ctx.clean_prefix
        invoked_with = ctx.invoked_with

        if self.bot.user is None:
            return

        bot_member = guild.get_member(self.bot.user.id)
        if not bot_member or not bot_member.guild_permissions.manage_nicknames:
            await self._reply(
                ctx,
                title="Missing Permissions",
                description="I need Manage Nicknames permission.",
                level="ERROR")
            return

        if not args:
            await self._reply(
                ctx,
                title="Missing Nickname",
                description=("Usage:\n"
                             f"`{prefix}{invoked_with} <nickname>`\n"
                             f"`{prefix}{invoked_with} @user <nickname>`\n"
                             f"`{prefix}{invoked_with} reset`"),
                level="WARNING")
            return

        target: discord.Member
        nickname: str

        if ctx.message.mentions:
            raw = ctx.message.mentions[0]
            member = guild.get_member(raw.id)
            if not member:
                await self._reply(ctx,
                                  title="Invalid Target",
                                  description="User must be in this server.",
                                  level="ERROR")
                return
            target = member
            nickname = args.replace(raw.mention, "", 1).strip()
        else:
            target = moderator
            nickname = args.strip()

        if not nickname:
            await self._reply(ctx,
                              title="Missing Nickname",
                              description="Please provide a nickname.",
                              level="ERROR")
            return

        is_self = target == moderator
        if not is_self:
            if not self._moderator_can_modify(guild, moderator, target):
                await self._reply(ctx,
                                  title="Permission Denied",
                                  description="You cannot modify this user.",
                                  level="ERROR")
                return

        if not self._bot_can_modify(guild, target):
            await self._reply(
                ctx,
                title="Role Hierarchy Issue",
                description="My role is too low to modify this user.",
                level="ERROR")
            return

        if nickname.lower() == "reset":
            if target.nick is None:
                await self._reply(
                    ctx,
                    title="No Nickname Set",
                    description="That user does not have a nickname.",
                    level="INFO")
                return

            old_nick = target.display_name

            try:
                await target.edit(nick=None,
                                  reason=f"Nickname reset by {moderator}")
            except discord.Forbidden:
                await self._reply(ctx,
                                  title="Missing Permissions",
                                  description="I cannot change this nickname.",
                                  level="ERROR")
                return
            except discord.HTTPException:
                await self._reply(ctx,
                                  title="Discord Error",
                                  description="Failed to update nickname.",
                                  level="ERROR")
                return

            success_emoji = EMOJIS.get("success") or "✅"
            await self._reply(
                ctx,
                title="Nickname Reset",
                description=
                f"{success_emoji} Nickname removed for {target.mention}.",
                level="SUCCESS")

            try:
                await send_mod_log(
                    guild=guild,
                    category="MODERATION",
                    title="Nickname Reset",
                    description=
                    f"{moderator} reset nickname of {target.mention}",
                    level="INFO",
                    actor=moderator,
                    target=target,
                    extra_fields={"Old Nickname": old_nick})
            except Exception:
                logger.exception("Failed to send rename moderation log")

            return

        # RENAME
        nickname = self._normalize(nickname)
        nickname = re.sub(r"[\u200B-\u200D\uFEFF]", "", nickname)
        nickname = " ".join(nickname.split())[:32]

        if "@everyone" in nickname or "@here" in nickname:
            await self._reply(ctx,
                              title="Invalid Nickname",
                              description="Mass mentions are not allowed.",
                              level="ERROR")
            return

        if self._contains_profanity(nickname):
            await self._reply(
                ctx,
                title="Blocked Nickname",
                description="Nickname contains prohibited content.",
                level="ERROR")
            return

        old_nick = target.display_name

        try:
            await target.edit(nick=nickname,
                              reason=f"Nickname changed by {moderator}")
        except discord.Forbidden:
            await self._reply(ctx,
                              title="Missing Permissions",
                              description="I cannot change this nickname.",
                              level="ERROR")
            return
        except discord.HTTPException:
            await self._reply(ctx,
                              title="Discord Error",
                              description="Failed to update nickname.",
                              level="ERROR")
            return

        success_emoji = EMOJIS.get("success") or "✅"
        await self._reply(
            ctx,
            title="Nickname Updated",
            description=
            f"{success_emoji} {target.mention} is now **{nickname}**.",
            level="SUCCESS")

        try:
            await send_mod_log(
                guild=guild,
                category="MODERATION",
                title="Nickname Changed",
                description=f"{moderator} changed nickname of {target.mention}",
                level="INFO",
                actor=moderator,
                target=target,
                extra_fields={
                    "Old Nickname": old_nick,
                    "New Nickname": nickname,
                })
        except Exception:
            logger.exception("Failed to send rename moderation log")


async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(RenameSystem(bot))
