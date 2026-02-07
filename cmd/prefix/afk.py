import discord
from discord.ext import commands

from utils.embeds import make_embed
from utils.emojis import EMOJIS
from db.db_helpers.afk import set_afk


class AFK(commands.Cog):
    """
    AFK status commands.

    Allows a user to mark themselves as AFK with an optional reason.
    """

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @commands.command(
        name="afk",
        help="Mark yourself as AFK",
    )
    async def afk(
        self,
        ctx: commands.Context,
        *,
        reason: str = "AFK",
    ) -> None:

        try:
            if ctx.guild is None:
                return

            set_afk(
                guild_id=ctx.guild.id,
                user_id=ctx.author.id,
                reason=reason,
            )

            embed = make_embed(
                title="AFK Enabled",
                description=(
                    f"{EMOJIS['okay']} You are now marked as **AFK**.\n"
                    f"{EMOJIS['arrow_point']} **Reason:** {reason}"),
                level="SUCCESS",
                footer=f"Requested by {ctx.author}",
            )

            await ctx.send(embed=embed)

        finally:
            # ─────────────────────────────
            # Guaranteed command cleanup
            # ─────────────────────────────
            try:
                await ctx.message.delete()
            except (discord.Forbidden, discord.NotFound):
                pass


async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(AFK(bot))
