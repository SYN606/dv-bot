import discord
from discord.ext import commands
import unicodedata

from utils.permissions.base_admin import BaseAdminCog
from utils.core.embeds import make_embed
from utils.core.emojis import EMOJIS
from utils.logging.mod_log import send_mod_log

PROFANITY_BLOCKLIST = {
    "badword1",
    "badword2",
}


class RenameSystem(BaseAdminCog):

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    # Helpers

    def _normalize(self, text: str) -> str:
        return unicodedata.normalize("NFKC", text)

    def _contains_profanity(self, text: str) -> bool:
        lower = text.lower()
        return any(word in lower for word in PROFANITY_BLOCKLIST)

    def _bot_can_modify(self, guild: discord.Guild,
                        target: discord.Member) -> bool:
        bot_member = guild.me
        return (bot_member.guild_permissions.manage_nicknames
                and target != guild.owner
                and target.top_role < bot_member.top_role)

    def _moderator_can_modify(self, guild: discord.Guild,
                              moderator: discord.Member,
                              target: discord.Member) -> bool:
        # Owner bypass
        if moderator.id == guild.owner_id:
            return True

        if target == guild.owner:
            return False

        if target == moderator:
            return True

        return target.top_role < moderator.top_role

    # RENAME COMMAND

    @commands.command(name="rename")
    @commands.guild_only()
    async def rename(self, ctx: commands.Context, *, args: str | None = None):

        guild = ctx.guild
        moderator: discord.Member = ctx.author
        prefix = ctx.clean_prefix

        if not args:
            return await ctx.reply(
                embed=make_embed(
                    title="Missing Nickname",
                    description=(f"Usage:\n"
                                 f"`{prefix} rename <nickname>`\n"
                                 f"`{prefix} rename @user <nickname>`\n"
                                 f"`{prefix} rename reset`"),
                    level="WARNING",
                ),
                mention_author=False,
            )

        # Try resolve mentioned user

        target = None
        nickname = None

        if ctx.message.mentions:
            target = ctx.message.mentions[0]
            nickname = args.replace(target.mention, "", 1).strip()
        else:
            target = moderator
            nickname = args.strip()

        if not nickname:
            return await ctx.reply(
                embed=make_embed(
                    title="Missing Nickname",
                    description="Please provide a nickname.",
                    level="ERROR",
                ),
                mention_author=False,
            )

        # RESET

        if nickname.lower() == "reset":

            if target.nick is None:
                return await ctx.reply(
                    embed=make_embed(
                        title="No Nickname Set",
                        description="That user does not have a nickname.",
                        level="INFO",
                    ),
                    mention_author=False,
                )

            if not self._moderator_can_modify(guild, moderator, target):
                return await ctx.reply(
                    embed=make_embed(
                        title="Permission Denied",
                        description="You cannot modify this user.",
                        level="ERROR",
                    ),
                    mention_author=False,
                )

            if not self._bot_can_modify(guild, target):
                return await ctx.reply(
                    embed=make_embed(
                        title="Role Hierarchy Issue",
                        description=(
                            "I cannot modify this user because my role "
                            "is lower than theirs.\n\n"
                            "Move my role higher in Server Settings → Roles."),
                        level="ERROR",
                    ),
                    mention_author=False,
                )

            old_nick = target.display_name

            try:
                await target.edit(nick=None)
            except discord.Forbidden:
                return await ctx.reply(
                    embed=make_embed(
                        title="Missing Permissions",
                        description="I cannot change this nickname.",
                        level="ERROR",
                    ),
                    mention_author=False,
                )

            await ctx.reply(
                embed=make_embed(
                    title="Nickname Reset",
                    description=
                    f"{EMOJIS['success']} Nickname removed for {target.mention}.",
                    level="SUCCESS",
                ),
                mention_author=False,
            )

            await send_mod_log(
                guild=guild,
                category="CONFIG",
                title="Nickname Reset",
                description=f"{target.mention} nickname reset.",
                actor=moderator,
                target=target,
                extra_fields={"Old Nickname": old_nick},
            )

            return

        # NORMAL RENAME

        nickname = self._normalize(nickname)
        nickname = " ".join(nickname.split())
        nickname = nickname[:32]

        if "@everyone" in nickname or "@here" in nickname:
            return await ctx.reply(
                embed=make_embed(
                    title="Invalid Nickname",
                    description="Mass mentions are not allowed.",
                    level="ERROR",
                ),
                mention_author=False,
            )

        if self._contains_profanity(nickname):
            return await ctx.reply(
                embed=make_embed(
                    title="Blocked Nickname",
                    description="That nickname contains prohibited content.",
                    level="ERROR",
                ),
                mention_author=False,
            )

        if target.display_name == nickname:
            return await ctx.reply(
                embed=make_embed(
                    title="No Change",
                    description="That nickname is already set.",
                    level="INFO",
                ),
                mention_author=False,
            )

        if not self._moderator_can_modify(guild, moderator, target):
            return await ctx.reply(
                embed=make_embed(
                    title="Permission Denied",
                    description="You cannot modify this user.",
                    level="ERROR",
                ),
                mention_author=False,
            )

        if not self._bot_can_modify(guild, target):
            return await ctx.reply(
                embed=make_embed(
                    title="Role Hierarchy Issue",
                    description=(
                        "I cannot modify this user because my role "
                        "is lower than theirs.\n\n"
                        "Move my role higher in Server Settings → Roles."),
                    level="ERROR",
                ),
                mention_author=False,
            )

        old_nick = target.display_name

        try:
            await target.edit(
                nick=nickname,
                reason=f"Nickname changed by {moderator}",
            )
        except discord.Forbidden:
            return await ctx.reply(
                embed=make_embed(
                    title="Missing Permissions",
                    description="I cannot change this nickname.",
                    level="ERROR",
                ),
                mention_author=False,
            )

        await ctx.reply(
            embed=make_embed(
                title="Nickname Updated",
                description=
                f"{EMOJIS['success']} {target.mention} is now **{nickname}**.",
                level="SUCCESS",
            ),
            mention_author=False,
        )

        await send_mod_log(
            guild=guild,
            category="CONFIG",
            title="Nickname Changed",
            description=f"{target.mention} nickname updated.",
            actor=moderator,
            target=target,
            extra_fields={
                "Old Nickname": old_nick,
                "New Nickname": nickname,
            },
        )


async def setup(bot: commands.Bot):
    await bot.add_cog(RenameSystem(bot))
