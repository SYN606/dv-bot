import asyncio
import datetime
import discord
from discord.ext import commands
from utils.permissions.base_admin import BaseAdminCog
from utils.core.embeds import make_embed
from utils.core.emojis import EMOJIS
from utils.logging.mod_log import send_mod_log

GuildChannel = discord.TextChannel | discord.Thread | discord.VoiceChannel | discord.StageChannel


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

        if await self._has_access(member=author, guild=guild, ctx=ctx):
            return True

        return author.guild_permissions.manage_messages

    async def _reply(self,
                     ctx: commands.Context,
                     title: str,
                     description: str,
                     level: str = "ERROR",
                     delete_after: int = 8):
        try:
            emoji_key = level.lower()
            system_emoji = EMOJIS.get(
                emoji_key, "") if emoji_key in EMOJIS else EMOJIS.get(
                    "warning", "")

            formatted_description = f"{system_emoji} {description}".strip(
            ) if system_emoji else description

            return await ctx.channel.send(
                embed=make_embed(
                    title=title,
                    description=formatted_description,
                    level=level,
                    use_emoji=False
                ),
                delete_after=delete_after)
        except discord.HTTPException:
            return None

    async def _cleanup(self, ctx: commands.Context):
        try:
            await ctx.message.delete()
        except (discord.Forbidden, discord.NotFound, discord.HTTPException):
            pass

    async def resolve_target(self,
                             ctx: commands.Context) -> discord.Member | None:
        if ctx.message.mentions:
            member = ctx.message.mentions[0]
            if isinstance(member, discord.Member):
                return member
        reference = ctx.message.reference
        if (reference and isinstance(reference.resolved, discord.Message)):
            author = reference.resolved.author
            if isinstance(author, discord.Member):
                return author
        return None

    async def collect_messages(
            self,
            *,
            channel: GuildChannel,
            amount: int,
            member: discord.Member | None,
            exclude: int | None = None) -> list[discord.Message]:
        messages: list[discord.Message] = []
        if member:
            scan_limit = self.MAX_SCAN
        else:
            scan_limit = min(amount + 50, self.MAX_SCAN)

        async for msg in channel.history(limit=scan_limit):
            if exclude and msg.id == exclude:
                continue
            if msg.pinned:
                continue
            if member and msg.author.id != member.id:
                continue
            messages.append(msg)
            if len(messages) >= amount:
                break

        return messages

    async def delete_messages(self, *, channel: GuildChannel,
                              messages: list[discord.Message]) -> int:
        now = discord.utils.utcnow()
        fourteen_days = datetime.timedelta(days=14)
        young: list[discord.Message] = []
        old: list[discord.Message] = []

        for msg in messages:
            if now - msg.created_at < fourteen_days:
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
    @commands.cooldown(1, 3, commands.BucketType.member)
    @commands.max_concurrency(1, per=commands.BucketType.guild, wait=False)
    async def purge(self, ctx: commands.Context, *args):
        member = await self.resolve_target(ctx)

        await self._cleanup(ctx)

        guild = ctx.guild
        channel = ctx.channel

        if guild is None:
            return

        if not isinstance(channel,
                          (discord.TextChannel, discord.Thread,
                           discord.VoiceChannel, discord.StageChannel)):
            return

        moderator = ctx.author
        if not isinstance(moderator, discord.Member):
            return

        if not await self.has_purge_permission(ctx):
            return await self._reply(
                ctx,
                "Permission Denied",
                "You do not have permission to use this command.",
                level="ERROR",
            )

        bot_member = guild.me
        if bot_member is None:
            return

        channel_perms = channel.permissions_for(bot_member)
        if not channel_perms.manage_messages:
            return await self._reply(
                ctx,
                "Missing Permissions",
                "I need the `Manage Messages` permission in this target channel.",
                level="ERROR",
            )

        amount = None

        if not args:
            return await self._reply(
                ctx,
                "Invalid Usage",
                ("`purge <amount>`\n"
                 "`purge @user <amount>`\n"
                 "`reply + purge <amount>`"),
                level="WARNING",
            )

        for arg in args:
            if arg.isdigit():
                amount = int(arg)
                break

        if amount is None:
            return await self._reply(
                ctx,
                "Missing Amount",
                "Please provide a valid number of messages to purge.",
                level="WARNING",
            )

        if amount < 1 or amount > self.MAX_PURGE:
            return await self._reply(
                ctx,
                "Invalid Amount",
                f"Amount must be between 1 and {self.MAX_PURGE}.",
                level="WARNING",
            )

        messages_to_delete = await self.collect_messages(
            channel=channel,
            amount=amount,
            member=member,
            exclude=ctx.message.id,
        )

        if not messages_to_delete:
            return await self._reply(
                ctx,
                "Purge Complete",
                "No messages matched your criteria to delete.",
                level="INFO",
                delete_after=5,
            )

        deleted_count = await self.delete_messages(
            channel=channel,
            messages=messages_to_delete,
        )

        target_string = f"from {member.mention}" if member else "from this channel"
        await self._reply(
            ctx,
            "Messages Purged",
            f"Successfully deleted **{deleted_count}** messages {target_string}.",
            level="SUCCESS",
            delete_after=5,
        )

        try:
            await send_mod_log(
                guild=guild,
                category="CONFIG",
                title="Channel Clean Purge",
                description=
                f"Bulk deleted **{deleted_count}** messages in {channel.mention}.",
                level="SUCCESS",
                actor=moderator,
                target=member,
                extra_fields={
                    "Channel ID": channel.id,
                    "Requested Target": amount,
                    "Actual Deleted": deleted_count
                })
        except Exception:
            pass

    @purge.error
    async def purge_error(self, ctx: commands.Context,
                          error: commands.CommandError):
        if isinstance(error, commands.CommandOnCooldown):
            await self._cleanup(ctx)
            return await self._reply(
                ctx,
                "Command on Cooldown",
                f"Please allow the database to settle. Retry in **{error.retry_after:.1f}s**.",
                level="WARNING",
                delete_after=4)

        if isinstance(error, commands.MaxConcurrencyReached):
            await self._cleanup(ctx)
            return await self._reply(
                ctx,
                "System Busy",
                "An administrative purge operation is currently running here. Please standby.",
                level="WARNING",
                delete_after=5)
        raise error


async def setup(bot: commands.Bot):
    await bot.add_cog(Purge(bot))
