from __future__ import annotations
import asyncio
import os
import time
import discord
from discord import Message
from discord.ui import Button
from discord.ui import View
from utils.core.embeds import make_embed
from utils.core.emojis import EMOJIS

__all__ = ("handle_bot_mention", )
MENTION_GIF = os.getenv("MENTION_GIF_URL")
MENTION_COOLDOWN = 5.0
_mention_cooldown: dict[int, float] = {}
_mention_locks: dict[int, asyncio.Lock] = {}


class MentionView(View):

    def __init__(self, bot: discord.Client,
                 author: discord.User | discord.Member):
        super().__init__(timeout=60)
        self.bot = bot
        self.author = author
        self.message: discord.Message | None = None

    async def interaction_check(self,
                                interaction: discord.Interaction) -> bool:
        if interaction.user.id != self.author.id:
            embed = make_embed(
                title="Access Denied",
                description=
                "Only the command author can use these operational buttons.",
                level="WARNING",
            )
            embed.set_footer(text=f"Action by : {self.author}",
                             icon_url=self.author.display_avatar.url)
            await interaction.response.send_message(embed=embed,
                                                    ephemeral=True)
            return False
        return True

    @discord.ui.button(label="Help Menu",
                       style=discord.ButtonStyle.primary,
                       emoji="📘")
    async def help_button(self, interaction: discord.Interaction, _: Button):
        embed = make_embed(
            title="Help Menu",
            description="Use `/help` to explore all modules and commands.",
            level="INFO",
        )
        embed.set_footer(text=f"Action by : {self.author}",
                         icon_url=self.author.display_avatar.url)
        await interaction.response.send_message(embed=embed, ephemeral=True)

    @discord.ui.button(label="Ping",
                       style=discord.ButtonStyle.secondary,
                       emoji="🏓")
    async def ping_button(self, interaction: discord.Interaction, _: Button):
        latency = round(self.bot.latency * 1000)
        embed = make_embed(
            title="Pong",
            description=f"Gateway Network Latency: `{latency} ms`",
            level="INFO",
        )
        embed.set_footer(text=f"Action by : {self.author}",
                         icon_url=self.author.display_avatar.url)
        await interaction.response.send_message(embed=embed, ephemeral=True)

    @discord.ui.button(label="System Configuration",
                       style=discord.ButtonStyle.secondary,
                       emoji="⚙️")
    async def setup_button(self, interaction: discord.Interaction, _: Button):
        embed = make_embed(
            title="Quick Setup",
            description=
            "Use `/verification` or `/setup_log` to configure operational settings.",
            level="INFO",
        )
        embed.set_footer(text=f"Action by : {self.author}",
                         icon_url=self.author.display_avatar.url)
        await interaction.response.send_message(embed=embed, ephemeral=True)

    async def on_timeout(self) -> None:
        for item in self.children:
            item.disabled = True  # type: ignore

        if not self.message:
            return

        try:
            await self.message.edit(view=self)
        except (discord.NotFound, discord.Forbidden, discord.HTTPException):
            pass


async def handle_bot_mention(bot: discord.Client, message: Message) -> bool:
    if bot.user is None or message.author.bot or message.webhook_id:
        return False

    if message.type != discord.MessageType.default or not message.guild:
        return False

    content = message.content.strip()
    valid_mentions = {f"<@{bot.user.id}>", f"<@!{bot.user.id}>"}
    if content not in valid_mentions:
        return False

    guild_id = message.guild.id
    lock = _mention_locks.setdefault(guild_id, asyncio.Lock())

    async with lock:
        now = asyncio.get_running_loop().time()
        last = _mention_cooldown.get(guild_id, 0)
        if now - last < MENTION_COOLDOWN:
            return True
        _mention_cooldown[guild_id] = now

        latency_ms = round(bot.latency * 1000)
        total_guilds = len(bot.guilds)
        total_users = sum(len(g.members) for g in bot.guilds)

        embed = make_embed(
            title="Digital Vigital • System Overview",
            description=
            (f"{EMOJIS.get('green_dot', '🟢')} **Bot Operational Infrastructure**\n"
             f"┕ Network Latency: `{latency_ms} ms` • Status: `Idle`\n\n"
             f"{EMOJIS.get('arrow_point', '➡️')} **Quick Directory Lookup**\n"
             f"┕ Use `/help` to view all available commands.\n"
             f"┕ Use `/verification` to set up server protection.\n\n"
             f"📊 **Cluster Metrics**\n"
             f"┕ Servers: `{total_guilds:,}` | Users Seen: `{total_users:,}`\n\n"
             f"{EMOJIS.get('developer', '👨‍💻')} **Developer Platform**\n"
             f"┕ **S Y N** • [Developer Portal](https://syn606.wtf/)"),
            level="SYSTEM")

        embed.set_footer(
            text=f"Action by : {message.author} • Performance Engineered",
            icon_url=message.author.display_avatar.url)

        if MENTION_GIF:
            embed.set_image(url=MENTION_GIF)

        view = MentionView(bot=bot, author=message.author)

        try:
            sent = await message.reply(
                embed=embed,
                view=view,
                mention_author=False,
                allowed_mentions=discord.AllowedMentions.none())
            view.message = sent

            try:
                await message.delete()
            except (discord.Forbidden, discord.NotFound,
                    discord.HTTPException):
                pass

        except (discord.Forbidden, discord.HTTPException):
            return True

    return True
