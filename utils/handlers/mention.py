from __future__ import annotations
import os
import asyncio
import discord
from discord import Message
from discord.ui import View, Button

from utils.embeds import make_embed
from utils.emojis import EMOJIS

__all__ = ("handle_bot_mention", )

# Env-based banner GIF
MENTION_GIF = os.getenv("MENTION_GIF_URL")

# Mention cooldown (per guild)
_mention_cooldown: dict[int, float] = {}


# Help Button View
class MentionView(View):

    def __init__(self, bot: discord.Client, author_id: int):
        super().__init__(timeout=60)
        self.bot = bot
        self.author_id = author_id
        self.message: discord.Message | None = None

    async def interaction_check(
        self,
        interaction: discord.Interaction,
    ) -> bool:
        return interaction.user.id == self.author_id

    @discord.ui.button(
        label="Open Help Menu",
        style=discord.ButtonStyle.primary,
        emoji="📘",
    )
    async def help_button(
        self,
        interaction: discord.Interaction,
        _: Button,
    ):
        try:
            if not interaction.response.is_done():
                await interaction.response.defer(ephemeral=True)
        except discord.NotFound:
            return

        await interaction.followup.send(
            embed=make_embed(
                title="Digital Vigital • Help",
                description=
                (f"{EMOJIS['arrow_point']} Use `/help` to explore everything.\n\n"
                 f"{EMOJIS['green_dot']} Slash-first architecture\n"
                 f"{EMOJIS['ping']} Optimized async core\n"
                 f"{EMOJIS['moderation']} Secure admin system"),
                level="INFO",
            ),
            ephemeral=True,
        )

    async def on_timeout(self):
        for item in self.children:
            item.disabled = True

        if self.message:
            try:
                await self.message.edit(view=self)
            except (discord.NotFound, discord.HTTPException):
                pass


# ─────────────────────────
# Mention Handler
# ─────────────────────────
async def handle_bot_mention(
    bot: discord.Client,
    message: Message,
) -> bool:

    if message.author.bot or bot.user is None:
        return False

    content = message.content.strip()
    if not content:
        return False

    # Accept mention only if it's the entire message
    valid_mentions = {
        bot.user.mention,
        f"<@!{bot.user.id}>",
    }

    if content not in valid_mentions:
        return False

    # ─────────────────────────
    # Cooldown protection (5s per guild)
    # ─────────────────────────
    now = asyncio.get_event_loop().time()
    guild_id = message.guild.id if message.guild else 0
    last = _mention_cooldown.get(guild_id, 0)

    if now - last < 5:
        return True  # silently ignore spam

    _mention_cooldown[guild_id] = now

    latency_ms = round(bot.latency * 1000)

    embed = make_embed(
        title="Digital Vigital • Yes?",
        description=(
            f"{EMOJIS['green_dot']} **Status:** Fully Operational\n"
            f"{EMOJIS['ping']} **Latency:** `{latency_ms} ms`\n\n"
            f"{EMOJIS['developer']} **Developer:** "
            f"**S Y N** • [Portfolio](https://syn606.pages.dev)\n\n"
            f"{EMOJIS['arrow_point']} You pinged me. I'm here.\n"
            f"{EMOJIS['arrow_point']} Try `/help` instead.\n"
            f"{EMOJIS['arrow_point']} I don’t bite… unless configured to."),
        level="SYSTEM",
        footer="Digital Vigital • Built different.",
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
