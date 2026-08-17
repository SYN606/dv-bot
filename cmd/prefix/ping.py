import time
import discord
from discord.ext import commands

from utils.core.embeds import make_embed
from utils.core.emojis import EMOJIS


class Ping(commands.Cog):
    """Diagnostics and health-check command providing real-time gateway and API latency metrics."""

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    async def _cleanup_invocation(self, ctx: commands.Context) -> None:
        """Safely delete original text invocation message if applicable."""
        if ctx.interaction:
            return
        try:
            await ctx.message.delete()
        except (discord.Forbidden, discord.NotFound, discord.HTTPException):
            pass

    @commands.hybrid_command(
        name="ping",
        description=
        "Display bot connection status and real-time latency metrics.")
    async def ping(self, ctx: commands.Context) -> None:
        """Measure WebSocket gateway heartbeat and HTTP API round-trip latency."""
        start_time = time.perf_counter()

        # Emoji retrievals with safe defaults using your EmojiRegistry.get() method
        loading_icon = EMOJIS.get("loading", "⏳")
        ping_icon = EMOJIS.get("animated_ping", "📡")
        success_icon = EMOJIS.get("success", "✅")
        arrow_icon = EMOJIS.get("arrow_point", "▶")
        bullet_icon = EMOJIS.get("green_dot", "•")
        warning_icon = EMOJIS.get("warning", "⚠️")

        # Send initial measurement message
        initial_embed = make_embed(
            title="Measuring Latency...",
            description=f"{loading_icon} Gathering diagnostic telemetry...",
            level="DEBUG",
            show_timestamp=False)
        message = await ctx.send(embed=initial_embed)

        # Calculate HTTP API Round-Trip Time
        api_latency = round((time.perf_counter() - start_time) * 1000)

        # Gateway WebSocket Latency
        gateway_latency = round(self.bot.latency * 1000)
        overall_latency = max(api_latency, gateway_latency)

        # Connection status evaluation
        if overall_latency < 200:
            status_text = f"{bullet_icon} Excellent"
            status_level = "SUCCESS"
        elif overall_latency < 400:
            status_text = f"{success_icon} Good"
            status_level = "INFO"
        else:
            status_text = f"{warning_icon} High Latency"
            status_level = "WARNING"

        embed = make_embed(
            title=f"{ping_icon} System Health & Latency",
            description=(
                f"{success_icon} Bot is online and fully operational.\n\n"
                f"{arrow_icon} **Live Connection Diagnostics:**"),
            level=status_level,
            fields=[
                ("WebSocket Gateway", f"{bullet_icon} `{gateway_latency} ms`",
                 True),
                ("HTTP API Response", f"{bullet_icon} `{api_latency} ms`",
                 True),
                ("Connection Quality", status_text, True),
            ],
            footer=f"Requested by {ctx.author}",
            footer_icon=ctx.author.display_avatar.url,
        )

        await message.edit(embed=embed)
        await self._cleanup_invocation(ctx)


async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(Ping(bot))
