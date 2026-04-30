import time
import discord
from discord.ext import commands
from typing import Optional
import os
import psutil  # optional but recommended

from utils.core.embeds import make_embed
from utils.core.emojis import EMOJIS

START_TIME = time.time()


# =====================================================
# UPTIME
# =====================================================
def format_uptime(seconds: int) -> str:
    days, seconds = divmod(seconds, 86400)
    hours, seconds = divmod(seconds, 3600)
    minutes, seconds = divmod(seconds, 60)

    parts = []
    if days:
        parts.append(f"{days}d")
    if hours:
        parts.append(f"{hours}h")
    if minutes:
        parts.append(f"{minutes}m")
    if seconds:
        parts.append(f"{seconds}s")

    return " ".join(parts) or "0s"


# =====================================================
# VIEW (INTERACTIVE PANEL)
# =====================================================
class ShardView(discord.ui.View):

    def __init__(self, cog, author_id: int):
        super().__init__(timeout=60)
        self.cog = cog
        self.author_id = author_id

    async def interaction_check(self, interaction: discord.Interaction) -> bool:
        if interaction.user.id != self.author_id:
            await interaction.response.send_message(
                "You cannot use this.",
                ephemeral=True,
            )
            return False
        return True

    @discord.ui.button(label="🔄 Refresh", style=discord.ButtonStyle.secondary)
    async def refresh(self, interaction: discord.Interaction, _):
        embed = await self.cog.build_embed(interaction.guild)
        await interaction.response.edit_message(embed=embed, view=self)


# =====================================================
# COG
# =====================================================
class Shards(commands.Cog):

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    # =====================================================
    # BUILD EMBED (REUSABLE)
    # =====================================================
    async def build_embed(self, guild: discord.Guild):

        now = int(time.time())
        uptime = format_uptime(int(now - START_TIME))

        latency = round(self.bot.latency * 1000)
        guilds = len(self.bot.guilds)
        users = sum((g.member_count or 0) for g in self.bot.guilds)

        shard_id = getattr(guild, "shard_id", 0) or 0
        shard_count = getattr(self.bot, "shard_count", 1) or 1

        # =================================================
        # SHARD LATENCY
        # =================================================
        shard_latency: Optional[int] = None
        try:
            shard = self.bot.get_shard(shard_id)  # type: ignore
            if shard:
                shard_latency = round(shard.latency * 1000)
        except Exception:
            pass

        # =================================================
        # STATUS
        # =================================================
        if latency < 120:
            status = EMOJIS["green_dot"]
        elif latency < 250:
            status = EMOJIS["warning"]
        else:
            status = EMOJIS["fail"]

        # =================================================
        # SYSTEM STATS (OPTIONAL)
        # =================================================
        ram = "N/A"
        cpu = "N/A"

        try:
            process = psutil.Process(os.getpid())
            ram = f"{process.memory_info().rss / 1024**2:.1f} MB"
            cpu = f"{psutil.cpu_percent()}%"
        except Exception:
            pass

        # =================================================
        # FIELDS
        # =================================================
        fields = [
            ("Latency", f"{status} `{latency} ms`", True),
            ("Uptime", f"`{uptime}`", True),
            ("Guilds", f"`{guilds}`", True),
            ("Users", f"`{users}`", True),
            ("Shard", f"`{shard_id + 1}/{shard_count}`", True),
            ("RAM", f"`{ram}`", True),
            ("CPU", f"`{cpu}`", True),
        ]

        if shard_latency is not None:
            fields.append(("Shard Latency", f"`{shard_latency} ms`", True))

        # =================================================
        # DYNAMIC BOT NAME
        # =================================================
        bot_name = self.bot.user.name if self.bot.user else "Bot"

        return make_embed(
            title=f"{bot_name} • System Diagnostics",
            description="All systems operational.\n\n*Realtime diagnostics panel.*",
            level="INFO",
            fields=fields,
            footer=f"{bot_name} Monitoring",
            use_emoji=True,
        )

    # =====================================================
    # COMMAND (NO RATE LIMIT)
    # =====================================================
    @commands.command(name="shards")
    @commands.guild_only()
    async def shards(self, ctx: commands.Context):

        try:
            embed = await self.build_embed(ctx.guild) # type: ignore
            view = ShardView(self, ctx.author.id)

            await ctx.send(embed=embed, view=view)

        except Exception as e:
            await ctx.send(f"Error: `{e}`")


# =====================================================
# SETUP
# =====================================================
async def setup(bot: commands.Bot):
    await bot.add_cog(Shards(bot))