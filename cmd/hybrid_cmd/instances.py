import discord
from discord.ext import commands
from datetime import datetime, timezone

from utils.embeds import make_embed
from db.engine import SessionLocal
from db.models import BotInstance


class Instances(commands.Cog):

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @commands.hybrid_command(
        name="instances",
        description="Show all running bot instances and shard status",
    )
    async def instances(self, ctx: commands.Context):
        now = datetime.now(timezone.utc)

        with SessionLocal() as session:
            instances = (session.query(BotInstance).order_by(
                BotInstance.priority.asc()).all())

        if not instances:
            if ctx.interaction:
                await ctx.interaction.response.send_message(
                    "No instances registered.",
                    ephemeral=True,
                )
            else:
                await ctx.reply("No instances registered.")
            return

        lines: list[str] = []

        for inst in instances:
            is_primary = inst.priority == 1
            crown = "👑 " if is_primary else ""
            role = "PRIMARY" if is_primary else "SECONDARY"

            uptime = (f"{inst.uptime_seconds // 3600}h "
                      f"{(inst.uptime_seconds % 3600) // 60}m")

            heartbeat_age = int((now - inst.last_heartbeat).total_seconds())

            status_icon = "🟢" if inst.status == "ready" else "🔴"

            shard_info = (f"{inst.shard_id}/{inst.shard_count}"
                          if inst.shard_id is not None else "N/A")

            lines.append(f"{crown}**{inst.instance_id}**\n"
                         f"• Role: `{role}` (priority {inst.priority})\n"
                         f"• Shard: `{shard_info}`\n"
                         f"• Ping: `{inst.ping_ms} ms`\n"
                         f"• Uptime: `{uptime}`\n"
                         f"• Status: {status_icon} `{inst.status}`\n"
                         f"• Last heartbeat: `{heartbeat_age}s ago`\n")

        embed = make_embed(
            title="Bot Instances & Shards",
            description="\n".join(lines),
            level="INFO",
            footer="Commands execute on PRIMARY only",
        )

        # Hybrid-safe response
        if ctx.interaction:
            await ctx.interaction.response.send_message(embed=embed)
        else:
            await ctx.reply(embed=embed, mention_author=False)


async def setup(bot: commands.Bot):
    await bot.add_cog(Instances(bot))
