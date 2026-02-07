import re
import discord
from discord.ext import commands

from utils.embeds import make_embed
from utils.emojis import EMOJIS
from utils.check_perms import is_bot_admin_ctx

# Matches <:name:id> and <a:name:id>
EMOJI_REGEX = re.compile(r"<(a?):(\w+):(\d+)>")


class EmojiSteal(commands.Cog):
    """
    Emoji management commands.

    Allows bot administrators to steal custom emojis
    by replying to a message that contains them.
    """

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @commands.command(
        name="steal",
        help="Steal custom emojis by replying to a message (admin only)",
    )
    async def steal(self, ctx: commands.Context) -> None:

        try:
            # ─────────────────────────
            # Context & permission checks
            # ─────────────────────────
            if ctx.guild is None:
                return

            if not is_bot_admin_ctx(ctx):
                await ctx.reply(
                    embed=make_embed(
                        title="Permission Denied",
                        description=
                        (f"{EMOJIS['fail']} You do not have permission to use this command."
                         ),
                        level="ERROR",
                    ),
                    mention_author=False,
                )
                return

            # ─────────────────────────
            # Must be a reply
            # ─────────────────────────
            ref = ctx.message.reference
            if not ref or not ref.message_id:
                await ctx.reply(
                    embed=make_embed(
                        title="Reply Required",
                        description=
                        (f"{EMOJIS['warning']} Reply to a message that contains custom emojis.\n\n"
                         f"{EMOJIS['arrow_point']} Usage: **reply → `dv steal`**"
                         ),
                        level="WARNING",
                    ),
                    mention_author=False,
                )
                return

            # ─────────────────────────
            # Fetch replied message
            # ─────────────────────────
            try:
                replied_msg = await ctx.channel.fetch_message(ref.message_id)
            except discord.NotFound:
                await ctx.reply(
                    embed=make_embed(
                        title="Message Not Found",
                        description=
                        (f"{EMOJIS['fail']} The referenced message no longer exists."
                         ),
                        level="ERROR",
                    ),
                    mention_author=False,
                )
                return

            matches = EMOJI_REGEX.findall(replied_msg.content)

            if not matches:
                await ctx.reply(
                    embed=make_embed(
                        title="No Custom Emojis Found",
                        description=
                        (f"{EMOJIS['warning']} The replied message does not contain any custom emojis."
                         ),
                        level="WARNING",
                    ),
                    mention_author=False,
                )
                return

            # ─────────────────────────
            # Steal emojis
            # ─────────────────────────
            added: list[str] = []
            failed: list[str] = []

            for animated, name, emoji_id in matches:
                ext = "gif" if animated == "a" else "png"
                url = f"https://cdn.discordapp.com/emojis/{emoji_id}.{ext}"

                try:
                    image_bytes = await self._fetch_bytes(url)
                    emoji = await ctx.guild.create_custom_emoji(
                        name=name,
                        image=image_bytes,
                        reason=f"Emoji stolen by {ctx.author}",
                    )
                    added.append(str(emoji))
                except discord.HTTPException:
                    failed.append(name)

            # ─────────────────────────
            # Result embed
            # ─────────────────────────
            embed = make_embed(
                title="Emoji Steal Result",
                description=
                (f"{EMOJIS['success']} **Added:** { ' '.join(added) if added else 'None' }\n\n"
                 f"{EMOJIS['red_dot']} **Failed:** { ', '.join(failed) if failed else 'None' }"
                 ),
                level="SUCCESS" if added else "WARNING",
                footer=f"Action by {ctx.author}",
            )

            await ctx.send(embed=embed)

        finally:
            # ─────────────────────────
            # Guaranteed cleanup
            # ─────────────────────────
            try:
                await ctx.message.delete()
            except (discord.Forbidden, discord.NotFound):
                pass

    # ─────────────────────────
    # Helpers
    # ─────────────────────────
    async def _fetch_bytes(self, url: str) -> bytes:
        """
        Fetch raw bytes from a URL using the bot's HTTP session.
        """
        session = self.bot.http._HTTPClient__session  # type: ignore
        async with session.get(url) as resp:
            return await resp.read()


async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(EmojiSteal(bot))
