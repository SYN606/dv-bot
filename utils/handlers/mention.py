from __future__ import annotations
import os
import asyncio
import discord
from discord import Message
from discord.ui import View, Button

from utils.core.embeds import make_embed
from utils.core.emojis import EMOJIS

__all__ = ("handle_bot_mention", )

MENTION_GIF = os.getenv("MENTION_GIF_URL")

_mention_cooldown: dict[int, float] = {}


# ─────────────────────────
# VIEW
# ─────────────────────────
class MentionView(View):

    def __init__(self, bot: discord.Client, author_id: int):
        super().__init__(timeout=60)
        self.bot = bot
        self.author_id = author_id
        self.message: discord.Message | None = None

    async def interaction_check(self,
                                interaction: discord.Interaction) -> bool:
        return interaction.user.id == self.author_id

    @discord.ui.button(label="Help",
                       style=discord.ButtonStyle.primary,
                       emoji="📘")
    async def help_button(self, interaction: discord.Interaction, _: Button):
        await interaction.response.send_message(
            embed=make_embed(
                title="Help Menu",
                description="Use `/help` to explore all commands.",
                level="INFO",
            ),
            ephemeral=True,
        )

    @discord.ui.button(label="Ping",
                       style=discord.ButtonStyle.secondary,
                       emoji="🏓")
    async def ping_button(self, interaction: discord.Interaction, _: Button):
        latency = round(self.bot.latency * 1000)
        await interaction.response.send_message(
            embed=make_embed(
                title="Pong",
                description=f"Latency: `{latency} ms`",
                level="INFO",
            ),
            ephemeral=True,
        )

    @discord.ui.button(label="Setup",
                       style=discord.ButtonStyle.secondary,
                       emoji="⚙️")
    async def setup_button(self, interaction: discord.Interaction, _: Button):
        await interaction.response.send_message(
            embed=make_embed(
                title="Quick Setup",
                description="Use `/setup_log` to configure moderation logs.",
                level="INFO",
            ),
            ephemeral=True,
        )

    async def on_timeout(self):
        for item in self.children:
            item.disabled = True  # type: ignore

        if self.message:
            try:
                await self.message.edit(view=self)
            except (discord.NotFound, discord.HTTPException):
                pass


# ─────────────────────────
# HANDLER
# ─────────────────────────
async def handle_bot_mention(bot: discord.Client, message: Message) -> bool:

    if message.author.bot or bot.user is None:
        return False

    content = message.content.strip()

    if content not in {f"<@{bot.user.id}>", f"<@!{bot.user.id}>"}:
        return False

    now = asyncio.get_running_loop().time()
    guild_id = message.guild.id if message.guild else 0
    last = _mention_cooldown.get(guild_id, 0)

    if now - last < 5:
        return True

    _mention_cooldown[guild_id] = now

    latency_ms = round(bot.latency * 1000)

    embed = make_embed(
        title="Digital Vigital",
        description=(
            f"{EMOJIS['green_dot']} **Online** • `{latency_ms} ms`\n\n"
            f"{EMOJIS['arrow_point']} Use `/help` to explore commands\n"
            f"{EMOJIS['arrow_point']} Use `/verification` to setup systems\n\n"
            f"{EMOJIS['developer']} **Developer**\n"
            f"**S Y N** • https://syn606.pages.dev"),
        level="SYSTEM",
        footer="Built for performance • Modular • Reliable",
    )

    if MENTION_GIF:
        embed.set_image(url=MENTION_GIF)

    view = MentionView(bot, author_id=message.author.id)

    try:
        sent = await message.reply(
            embed=embed,
            view=view,
            mention_author=False,
        )
        view.message = sent
    except discord.HTTPException:
        pass

    return True
