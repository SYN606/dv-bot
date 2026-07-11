import discord
from discord.ext import commands
from typing import Optional
from typing_extensions import Annotated
import re
from utils.permissions.base_admin import BaseAdminCog, admin_command
from utils.core.embeds import make_embed
from utils.core.emojis import EMOJIS

VALID_SLOWMODE_INTERVALS = [
    0, 5, 10, 15, 30, 60, 120, 300, 600, 900, 1800, 3600, 7200, 21600
]


class SlowmodeTimeConverter(commands.Converter[int]):

    async def convert(self, ctx: commands.Context, argument: str) -> int:
        argument = argument.lower().strip()

        if argument == "reset":
            return 0

        if argument.isdigit():
            return int(argument)

        match = re.match(r"^(\d+)([smh])$", argument)
        if not match:
            raise commands.BadArgument("Invalid format.")

        value, unit = match.groups()
        value = int(value)

        if unit == 's':
            return value
        elif unit == 'm':
            return value * 60
        elif unit == 'h':
            return value * 3600

        raise commands.BadArgument("Invalid unit.")


class Slowmode(BaseAdminCog):

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    async def _reply(self,
                     ctx: commands.Context,
                     *,
                     title: str,
                     description: str,
                     level: str = "ERROR") -> None:
        try:
            embed = make_embed(title=title,
                               description=description,
                               level=level)
            embed.set_footer(text=f"Moderator: {ctx.author}",
                             icon_url=ctx.author.display_avatar.url)
            await ctx.reply(embed=embed, mention_author=False)
        except discord.HTTPException:
            pass

    @admin_command(
        name="slowmode",
        aliases=["sm"],
        description=
        "Sets or displays the slowmode delay using standard Discord intervals."
    )
    @commands.has_permissions(manage_channels=True)
    @commands.cooldown(1, 3, commands.BucketType.channel)
    async def slowmode(
            self,
            ctx: commands.Context,
            action: Optional[Annotated[int, SlowmodeTimeConverter]] = None,
            channel: Optional[discord.TextChannel] = None):

        target = channel or ctx.channel
        if not isinstance(target,
                          (discord.TextChannel, discord.VoiceChannel,
                           discord.StageChannel, discord.ForumChannel)):
            await self._reply(
                ctx,
                title="Invalid Channel",
                description="This channel does not support slowmode.",
                level="ERROR")
            return

        if action is None:
            intervals_str = ", ".join(f"`{s}s`"
                                      for s in VALID_SLOWMODE_INTERVALS
                                      if s != 0)
            usage_desc = (
                f"**Current Status:** Current delay in {target.mention} is **{target.slowmode_delay}s**.\n\n"
                f"**How to use:**\n"
                f"• `ts sm <time>` → e.g., `ts sm 1m` or `ts sm 60`\n"
                f"• `ts sm reset` → Disables slowmode\n"
                f"• `ts sm <time> [#channel]` → Targets a specific channel\n\n"
                f"**Supported intervals:**\n{intervals_str}")
            await self._reply(ctx,
                              title="Slowmode Command Guide",
                              description=usage_desc,
                              level="INFO")
            return

        if action not in VALID_SLOWMODE_INTERVALS:
            intervals_str = ", ".join(f"`{s}s`"
                                      for s in VALID_SLOWMODE_INTERVALS)
            await self._reply(
                ctx,
                title="Invalid Interval",
                description=
                (f"{EMOJIS.get('fail')} Discord only supports specific native intervals.\n\n"
                 f"**Choose from:** {intervals_str}"),
                level="WARNING")
            return

        try:
            await target.edit(slowmode_delay=action,
                              reason=f"Slowmode updated by {ctx.author}")

            verb = "disabled in" if action == 0 else "set to"
            display_val = f"**{action}s**" if action != 0 else ""

            await self._reply(
                ctx,
                title="Slowmode Updated",
                description=
                f"{EMOJIS.get('success')} Slowmode {verb} {target.mention} {display_val}.",
                level="SUCCESS")

            try:
                await ctx.message.delete()
            except discord.HTTPException:
                pass

        except discord.Forbidden:
            await self._reply(
                ctx,
                title="Missing Permissions",
                description=
                f"I lack the `Manage Channels` permission to modify {target.mention}.",
                level="WARNING")

    async def slowmode_cmd_error(self, ctx: commands.Context,
                                 error: commands.CommandError):
        if isinstance(error, commands.MissingPermissions):
            await self._reply(
                ctx,
                title="Access Denied",
                description=
                "You need `Manage Channels` permissions to run this.",
                level="WARNING")
        elif isinstance(error, commands.BadArgument):
            intervals_str = ", ".join(f"`{s}s`"
                                      for s in VALID_SLOWMODE_INTERVALS
                                      if s != 0)
            await self._reply(
                ctx,
                title="Invalid Input Format",
                description=
                ("**Usage:** `ts sm <time|reset> [#channel]` \n"
                 "Formats accepted: `5s`, `1m`, `2h`, `60` (seconds), or `reset`.\n\n"
                 f"**Valid steps:** {intervals_str}"),
                level="WARNING")
        elif isinstance(error, commands.CommandOnCooldown):
            await self._reply(
                ctx,
                title="Cooldown",
                description=f"Please wait **{error.retry_after:.1f}s**.",
                level="WARNING")


Slowmode.slowmode.error(Slowmode.slowmode_cmd_error)  # type: ignore


async def setup(bot: commands.Bot):
    await bot.add_cog(Slowmode(bot))
