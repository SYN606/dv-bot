import re
import discord
from discord.ext import commands

from utils.embeds import make_embed
from utils.emojis import EMOJIS
from utils.check_perms import is_bot_admin_ctx

# Regex for custom emojis: <:name:id> or <a:name:id>
EMOJI_REGEX = re.compile(r"<(a?):(\w+):(\d+)>")


class EmojiSteal(commands.Cog):

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @commands.command(
        name="steal",
        help="Steal custom emoji by replying to a message (admin only)",
    )
    async def steal(self, ctx: commands.Context):
        if ctx.guild is None:
            return

        # ── Permission check
        if not is_bot_admin_ctx(ctx):
            await ctx.reply(
                embed=make_embed(
                    title="Permission Denied",
                    description="You are not allowed to steal emojis.",
                    level="ERROR",
                ),
                mention_author=False,
            )
            await self._cleanup(ctx)
            return

        # ── Must be a reply
        if not ctx.message.reference or not ctx.message.reference.message_id:
            await ctx.reply(
                embed=make_embed(
                    title="Reply Required",
                    description=
                    (f"{EMOJIS['red_dot']} Reply to a message that contains custom emojis.\n\n"
                     f"{EMOJIS['arrow_point']} Usage: **reply → `dv steal`**"),
                    level="WARNING",
                ),
                mention_author=False,
            )
            await self._cleanup(ctx)
            return

        # ── Fetch replied message
        try:
            replied_msg = await ctx.channel.fetch_message(
                ctx.message.reference.message_id)
        except discord.NotFound:
            await ctx.reply(
                embed=make_embed(
                    title="Message Not Found",
                    description="The replied message no longer exists.",
                    level="ERROR",
                ),
                mention_author=False,
            )
            await self._cleanup(ctx)
            return

        matches = EMOJI_REGEX.findall(replied_msg.content)

        if not matches:
            await ctx.reply(
                embed=make_embed(
                    title="No Custom Emojis Found",
                    description=
                    f"{EMOJIS['red_dot']} That message does not contain any custom emojis.",
                    level="WARNING",
                ),
                mention_author=False,
            )
            await self._cleanup(ctx)
            return

        added: list[str] = []
        failed: list[str] = []

        for animated, name, emoji_id in matches:
            ext = "gif" if animated == "a" else "png"
            url = f"https://cdn.discordapp.com/emojis/{emoji_id}.{ext}"

            try:
                emoji = await ctx.guild.create_custom_emoji(
                    name=name,
                    image=await self._fetch_bytes(url),
                    reason=f"Emoji stolen by {ctx.author}",
                )
                added.append(str(emoji))
            except discord.HTTPException:
                failed.append(name)

        # ── Result embed
        embed = make_embed(
            title="Emoji Steal Result",
            description=
            (f"{EMOJIS['success']} **Added:** {' '.join(added) if added else 'None'}\n\n"
             f"{EMOJIS['red_dot']} **Failed:** {', '.join(failed) if failed else 'None'}"
             ),
            level="SUCCESS" if added else "WARNING",
            footer=f"Action by {ctx.author}",
        )

        await ctx.send(embed=embed)
        await self._cleanup(ctx)

    # ─────────────────────────────
    # HELPERS
    # ─────────────────────────────
    async def _fetch_bytes(self, url: str) -> bytes:
        async with self.bot.http._HTTPClient__session.get(
                url) as resp:  # type: ignore
            return await resp.read()

    async def _cleanup(self, ctx: commands.Context) -> None:
        try:
            await ctx.message.delete()
        except (discord.Forbidden, discord.NotFound):
            pass


async def setup(bot: commands.Bot):
    await bot.add_cog(EmojiSteal(bot))
