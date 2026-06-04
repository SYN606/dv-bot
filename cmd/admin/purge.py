import asyncio
import datetime
import discord
from discord.ext import commands
from utils.permissions.base_admin import (BaseAdminCog)
from utils.core.embeds import make_embed
from utils.core.emojis import EMOJIS
from utils.logging.mod_log import (send_mod_log)


class Purge(BaseAdminCog):

    MAX_PURGE = 1000
    MAX_SCAN = 5000

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    async def has_purge_permission(self, ctx: commands.Context) -> bool:
        guild = ctx.guild
        if guild is None:
            return False
        author = ctx.author
        if not isinstance(author, discord.Member):
            return False
        # OWNER
        if author.id == guild.owner_id:
            return True
        perms = (author.guild_permissions)
        # ADMIN
        if perms.administrator:
            return True
        # MANAGE MESSAGES
        return perms.manage_messages

    async def _reply(self,
                     ctx: commands.Context,
                     title: str,
                     description: str,
                     level: str = "ERROR"):
        try:
            return await ctx.reply(embed=make_embed(title=title,
                                                    description=description,
                                                    level=level),
                                   mention_author=False)
        except discord.HTTPException:
            return None

    async def _cleanup(self, ctx: commands.Context):
        try:
            await ctx.message.delete()
        except (discord.Forbidden, discord.NotFound, discord.HTTPException):
            pass

    async def resolve_target(self,
                             ctx: commands.Context) -> discord.Member | None:

        # MENTION
        if ctx.message.mentions:
            member = ctx.message.mentions[0]
            if isinstance(member, discord.Member):
                return member

        # REPLY
        reference = (ctx.message.reference)
        if (reference and isinstance(reference.resolved, discord.Message)):

            author = (reference.resolved.author)
            if isinstance(author, discord.Member):
                return author
        return None

    async def collect_messages(
            self, *, channel: discord.TextChannel, amount: int,
            member: discord.Member | None) -> list[discord.Message]:
        messages: list[discord.Message] = []
        scan_limit = (amount * 8 if member else amount)
        scan_limit = min(scan_limit, self.MAX_SCAN)
        async for msg in channel.history(limit=scan_limit):
            if msg.pinned:
                continue
            if (member and msg.author.id != member.id):
                continue
            messages.append(msg)
            if (len(messages) >= amount):
                break
        return messages

    async def delete_messages(self, *, channel: discord.TextChannel,
                              messages: list[discord.Message]) -> int:

        now = (discord.utils.utcnow())
        fourteen_days = (datetime.timedelta(days=14))
        young = []
        old = []
        for msg in messages:
            if (now - msg.created_at < fourteen_days):
                young.append(msg)
            else:
                old.append(msg)
        deleted = 0

        while young:
            batch = young[:100]
            young = young[100:]
            try:
                await channel.delete_messages(batch)
                deleted += len(batch)
            except discord.HTTPException:
                pass

        # OLD DELETE
        for msg in old:
            try:
                await msg.delete()
                deleted += 1
                await asyncio.sleep(0.35)
            except discord.HTTPException:
                pass
        return deleted

    @commands.command(name="purge")
    @commands.guild_only()
    @commands.cooldown(1, 10, commands.BucketType.user)
    @commands.max_concurrency(1, per=commands.BucketType.guild, wait=False)
    async def purge(self, ctx: commands.Context, *args):
        guild = ctx.guild
        channel = ctx.channel

        if (guild is None or not isinstance(channel, discord.TextChannel)):
            return
        moderator = ctx.author
        if not isinstance(moderator, discord.Member):
            return

        # MANUAL PERMISSION CHECK
        if not await self.has_purge_permission(ctx, ):
            return await self._reply(ctx, "Permission Denied",
                                     (f"{EMOJIS['fail']} "
                                      "You do not have permission "
                                      "to use this command."))
        # BOT CHECK
        bot_member = guild.me
        if (bot_member is None
                or not bot_member.guild_permissions.manage_messages):
            return await self._reply(ctx, "Missing Permissions",
                                     ("I need "
                                      "`Manage Messages` "
                                      "permission."))
        member = None
        amount = None
        # NO ARGS
        if not args:
            return await self._reply(ctx,
                                     "Invalid Usage",
                                     ("`purge <amount>`\n"
                                      "`purge @user <amount>`\n"
                                      "`reply + purge <amount>`"),
                                     level="WARNING")

        # ONLY AMOUNT
        if len(args) == 1:
            try:
                amount = int(args[0], )
            except ValueError:
                return await self._reply(ctx,
                                         "Invalid Amount", ("Amount must be "
                                                            "a number."),
                                         level="WARNING")
            # REPLY TARGET SUPPORT
            member = await self.resolve_target(ctx, )
        elif len(args) == 2:
            member = await self.resolve_target(ctx, )
            if member is None:
                return await self._reply(ctx,
                                         "Invalid User", ("Mention a valid "
                                                          "member or reply "
                                                          "to their message."),
                                         level="WARNING")
            try:
                amount = int(args[1], )
            except ValueError:
                return await self._reply(ctx,
                                         "Invalid Amount", ("Amount must be "
                                                            "a number."),
                                         level="WARNING")
        else:
            return await self._reply(ctx,
                                     "Invalid Usage", ("Too many arguments."),
                                     level="WARNING")
        if (amount is None or amount <= 0):
            return await self._reply(ctx,
                                     "Invalid Amount", ("Amount must be "
                                                        "greater than 0."),
                                     level="WARNING")
        if amount > self.MAX_PURGE:
            return await self._reply(ctx,
                                     "Limit Exceeded",
                                     (f"Maximum purge limit "
                                      f"is **{self.MAX_PURGE}**."),
                                     level="WARNING")
        await self._cleanup(ctx)
        messages = await self.collect_messages(channel=channel,
                                               amount=amount,
                                               member=member)
        if not messages:
            return await ctx.send(
                embed=make_embed(title="Nothing Found",
                                 description=("No matching messages "
                                              "were found."),
                                 level="INFO"))
        deleted = await self.delete_messages(channel=channel,
                                             messages=messages)
        if member:
            description = (f"{EMOJIS['moderation']} "
                           f"Cleared **{deleted}** "
                           f"messages from "
                           f"{member.mention}")
        else:
            description = (f"{EMOJIS['moderation']} "
                           f"Cleared **{deleted}** "
                           f"messages")
        embed = make_embed(title="Messages Purged",
                           description=description,
                           level="SUCCESS",
                           footer=f"Action by {moderator}")
        confirm = await ctx.send(embed=embed)
        try:

            await send_mod_log(guild=guild,
                               category="MODERATION",
                               title="Messages Purged",
                               description=description,
                               level="WARNING",
                               actor=moderator,
                               target=member,
                               extra_fields={
                                   "Channel": channel.mention,
                                   "Deleted Count": deleted
                               })

        except Exception:
            pass
        await asyncio.sleep(5, )
        try:
            await confirm.delete()
        except discord.HTTPException:
            pass


async def setup(bot: commands.Bot):
    await bot.add_cog(Purge(bot))
