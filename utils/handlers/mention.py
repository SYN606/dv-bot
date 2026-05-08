from __future__ import annotations

import asyncio
import os

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

    def __init__(
        self,
        bot: discord.Client,
        author_id: int,
    ):

        super().__init__(timeout=60)

        self.bot = bot

        self.author_id = author_id

        self.message: discord.Message | None = None

    async def interaction_check(
        self,
        interaction: discord.Interaction,
    ) -> bool:

        if (interaction.user.id != self.author_id):

            await interaction.response.send_message(
                embed=make_embed(
                    title="Access Denied",
                    description=("Only the command author "
                                 "can use these buttons."),
                    level="WARNING",
                ),
                ephemeral=True,
            )

            return False

        return True

    @discord.ui.button(
        label="Help",
        style=discord.ButtonStyle.primary,
        emoji="📘",
    )
    async def help_button(
        self,
        interaction: discord.Interaction,
        _: Button,
    ):

        await interaction.response.send_message(
            embed=make_embed(
                title="Help Menu",
                description=("Use `/help` to explore "
                             "all commands."),
                level="INFO",
            ),
            ephemeral=True,
        )

    @discord.ui.button(
        label="Ping",
        style=discord.ButtonStyle.secondary,
        emoji="🏓",
    )
    async def ping_button(
        self,
        interaction: discord.Interaction,
        _: Button,
    ):

        latency = round(self.bot.latency * 1000)

        await interaction.response.send_message(
            embed=make_embed(
                title="Pong",
                description=(f"Gateway latency: "
                             f"`{latency} ms`"),
                level="INFO",
            ),
            ephemeral=True,
        )

    @discord.ui.button(
        label="Setup",
        style=discord.ButtonStyle.secondary,
        emoji="⚙️",
    )
    async def setup_button(
        self,
        interaction: discord.Interaction,
        _: Button,
    ):

        await interaction.response.send_message(
            embed=make_embed(
                title="Quick Setup",
                description=("Use `/setup_log` "
                             "to configure moderation logs."),
                level="INFO",
            ),
            ephemeral=True,
        )

    async def on_timeout(self, ) -> None:

        for item in self.children:

            item.disabled = True  # type: ignore

        if not self.message:
            return

        try:

            await self.message.edit(view=self)

        except (
                discord.NotFound,
                discord.Forbidden,
                discord.HTTPException,
        ):

            pass


async def handle_bot_mention(
    bot: discord.Client,
    message: Message,
) -> bool:

    if bot.user is None:
        return False

    if message.author.bot:
        return False

    if message.webhook_id:
        return False

    if (message.type != discord.MessageType.default):

        return False

    if not message.guild:
        return False

    content = message.content.strip()

    valid_mentions = {
        f"<@{bot.user.id}>",
        f"<@!{bot.user.id}>",
    }

    if content not in valid_mentions:
        return False

    guild_id = message.guild.id

    lock = _mention_locks.setdefault(
        guild_id,
        asyncio.Lock(),
    )

    async with lock:

        now = asyncio.get_running_loop().time()

        last = _mention_cooldown.get(
            guild_id,
            0,
        )

        if (now - last < MENTION_COOLDOWN):

            return True

        _mention_cooldown[guild_id] = now

        latency_ms = round(bot.latency * 1000)

        embed = make_embed(
            title="Digital Vigital",
            description=(f"{EMOJIS['green_dot']} "
                         f"**Online** • "
                         f"`{latency_ms} ms`\n\n"
                         f"{EMOJIS['arrow_point']} "
                         f"Use `/help` to "
                         f"explore commands\n"
                         f"{EMOJIS['arrow_point']} "
                         f"Use `/verification` "
                         f"to setup systems\n\n"
                         f"{EMOJIS['developer']} "
                         f"**Developer**\n"
                         f"**S Y N** • "
                         f"https://syn606.pages.dev"),
            level="SYSTEM",
            footer=("Built for performance • "
                    "Modular • Reliable"),
        )

        if MENTION_GIF:

            embed.set_image(url=MENTION_GIF)

        view = MentionView(
            bot=bot,
            author_id=message.author.id,
        )

        try:

            sent = await message.reply(
                embed=embed,
                view=view,
                mention_author=False,
                allowed_mentions=discord.AllowedMentions.none(),
            )

            view.message = sent

        except (
                discord.Forbidden,
                discord.HTTPException,
        ):

            return True

    return True
