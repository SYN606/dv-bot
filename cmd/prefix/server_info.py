from __future__ import annotations

import discord
from discord.ext import commands
import logging

logger = logging.getLogger("DigitalVigital")


class ServerInfo(commands.Cog):

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @commands.command(
        name="serverinfo",
        aliases=["si", "server", "guildinfo", "ginfo"],
        help=
        "Displays comprehensive, beautifully formatted information about the server."
    )
    @commands.guild_only()
    @commands.bot_has_permissions(embed_links=True)
    async def serverinfo(self, ctx: commands.Context):
        # The guild is guaranteed to exist due to @commands.guild_only()
        # We assign it to a variable and check it to satisfy Pylance's static type checker.
        guild = ctx.guild
        if not guild:
            return

        # 1. Graceful Owner Resolution
        # We try to use the cache first; fetch if unavailable.
        owner = guild.owner
        if not owner and guild.owner_id:
            try:
                owner = await guild.fetch_member(guild.owner_id)
            except (discord.HTTPException, discord.NotFound):
                owner = None

        owner_display = owner.mention if owner else f"Unknown ID: `{guild.owner_id}`"

        # 2. Member Statistics
        # We use a generator expression for efficiency.
        total_members = guild.member_count or 0
        bots = sum(1 for m in guild.members if m.bot)
        humans = total_members - bots

        # 3. Build the Base Embed
        embed = discord.Embed(title=f"Server Information: {guild.name}",
                              description=guild.description
                              or "No server description provided.",
                              color=discord.Color.blurple(),
                              timestamp=ctx.message.created_at)

        # 4. Handle Visuals (Icons and Banners)
        if guild.icon:
            embed.set_thumbnail(url=guild.icon.url)
        if guild.banner:
            embed.set_image(url=guild.banner.url)

        # 5. Add Structured Data Fields
        embed.add_field(
            name="🛡️ General",
            value=(
                f"**Owner:** {owner_display}\n"
                f"**Created:** <t:{int(guild.created_at.timestamp())}:R>\n"
                f"**ID:** `{guild.id}`\n"
                f"**Verification:** `{str(guild.verification_level).title()}`"
            ),
            inline=False)

        embed.add_field(name="👥 Members",
                        value=(f"**Total:** {total_members:,}\n"
                               f"**Humans:** {humans:,}\n"
                               f"**Bots:** {bots:,}"),
                        inline=True)

        embed.add_field(name="💬 Channels",
                        value=(f"**Text:** {len(guild.text_channels)}\n"
                               f"**Voice:** {len(guild.voice_channels)}\n"
                               f"**Categories:** {len(guild.categories)}"),
                        inline=True)

        embed.add_field(
            name="✨ Assets & Boosts",
            value=
            (f"**Roles:** {len(guild.roles)}\n"
             f"**Emojis:** {len(guild.emojis)}/{guild.emoji_limit}\n"
             f"**Boosts:** Level {guild.premium_tier} ({guild.premium_subscription_count} boosts)"
             ),
            inline=True)

        # Footer attribution
        embed.set_footer(text=f"Requested by {ctx.author.display_name}",
                         icon_url=ctx.author.display_avatar.url
                         if ctx.author.avatar else None)

        # 6. Send the embed
        await ctx.send(embed=embed)


async def setup(bot: commands.Bot):
    await bot.add_cog(ServerInfo(bot))
