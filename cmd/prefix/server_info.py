from __future__ import annotations

import logging
import discord
from discord.ext import commands

from utils.core.embeds import make_embed
from utils.core.emojis import EMOJIS

logger = logging.getLogger("DigitalVigital")


class ServerInfo(commands.Cog):
    """Cog for displaying detailed server metadata and statistics."""

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
        name="serverinfo",
        aliases=["si", "server", "guildinfo", "ginfo"],
        description=
        "Display comprehensive, beautifully formatted information about the server."
    )
    @commands.guild_only()
    @commands.bot_has_permissions(embed_links=True)
    async def serverinfo(self, ctx: commands.Context) -> None:
        """Displays rich guild telemetry, statistics, and server assets."""
        guild = ctx.guild
        if not guild:
            return

        # 1. Emoji Fetching with Safe Defaults
        arrow_icon = EMOJIS.get("arrow_point", "▶")
        bullet_icon = EMOJIS.get("green_dot", "•")
        owner_icon = EMOJIS.get("owner", "👑")
        member_icon = EMOJIS.get("member", "👥")
        bot_icon = EMOJIS.get("bot", "🤖")
        booster_icon = EMOJIS.get("booster", "🚀")

        # 2. Graceful Owner Resolution
        owner = guild.owner
        if not owner and guild.owner_id:
            try:
                owner = await guild.fetch_member(guild.owner_id)
            except (discord.HTTPException, discord.NotFound):
                owner = None

        owner_display = owner.mention if owner else f"Unknown ID: `{guild.owner_id}`"

        # 3. Member Statistics
        total_members = guild.member_count or 0
        bots = sum(1 for m in guild.members if m.bot)
        humans = total_members - bots

        # 4. Channel Telemetry
        text_channels = len(guild.text_channels)
        voice_channels = len(guild.voice_channels)
        categories = len(guild.categories)
        stage_channels = len(guild.stage_channels)
        forum_channels = sum(1 for c in guild.channels
                             if isinstance(c, discord.ForumChannel))
        total_channels = (text_channels + voice_channels + stage_channels +
                          forum_channels)

        # 5. Construct Data Fields for Embedded Presentation
        general_info = (
            f"{owner_icon} **Owner:** {owner_display}\n"
            f"{arrow_icon} **Created:** <t:{int(guild.created_at.timestamp())}:R>\n"
            f"{arrow_icon} **Server ID:** `{guild.id}`\n"
            f"{arrow_icon} **Verification:** `{str(guild.verification_level).title()}`"
        )

        member_stats = (f"{member_icon} **Total:** `{total_members:,}`\n"
                        f"{bullet_icon} **Humans:** `{humans:,}`\n"
                        f"{bot_icon} **Bots:** `{bots:,}`")

        channel_stats = (
            f"{bullet_icon} **Total:** `{total_channels}`\n"
            f"{bullet_icon} **Text / Forum:** `{text_channels + forum_channels}`\n"
            f"{bullet_icon} **Voice / Stage:** `{voice_channels + stage_channels}`\n"
            f"{bullet_icon} **Categories:** `{categories}`")

        asset_stats = (
            f"{bullet_icon} **Roles:** `{len(guild.roles)}`\n"
            f"{bullet_icon} **Emojis:** `{len(guild.emojis)}/{guild.emoji_limit}`\n"
            f"{bullet_icon} **Stickers:** `{len(guild.stickers)}/{guild.sticker_limit}`\n"
            f"{booster_icon} **Boosts:** Level `{guild.premium_tier}` (`{guild.premium_subscription_count}` boosts)"
        )

        fields = [("General Information", general_info, False),
                  ("Members", member_stats, True),
                  ("Channels", channel_stats, True),
                  ("Assets & Boosts", asset_stats, True)]

        # 6. Build Final Embed
        icon_url = guild.icon.url if guild.icon else None
        banner_url = guild.banner.url if guild.banner else None
        description = guild.description or "No server description provided."

        embed = make_embed(title=f"Server Information: {guild.name}",
                           description=description,
                           level="INFO",
                           fields=fields,
                           thumbnail=icon_url,
                           image=banner_url,
                           footer=f"Requested by {ctx.author}",
                           footer_icon=ctx.author.display_avatar.url,
                           show_timestamp=True)

        await ctx.send(embed=embed)
        await self._cleanup_invocation(ctx)


async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(ServerInfo(bot))
