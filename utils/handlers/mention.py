from __future__ import annotations
import discord
from discord import Message
from discord.ui import View, Button

from utils.embeds import make_embed
from utils.emojis import EMOJIS

__all__ = ("handle_bot_mention", )

# ─────────────────────────
# Banner GIF
# ─────────────────────────
MENTION_GIF = ("https://cdn.discordapp.com/attachments/1476443404207652916/"
               "1476445134148210803/not_funny.gif")


# ─────────────────────────
# Help Button View
# ─────────────────────────
class MentionView(View):

    def __init__(self, bot: discord.Client):
        super().__init__(timeout=60)
        self.bot = bot

    @discord.ui.button(
        label="Open Help Menu",
        style=discord.ButtonStyle.primary,
        emoji="📘",
    )
    async def help_button(
        self,
        interaction: discord.Interaction,
        button: Button,
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


# ─────────────────────────
# Mention Handler
# ─────────────────────────
async def handle_bot_mention(
    bot: discord.Client,
    message: Message,
) -> bool:
    """
    Premium mention handler.
    Savage but clean.
    """

    # Hard guards
    if message.author.bot:
        return False

    if bot.user is None:
        return False

    content = message.content.strip()
    if not content:
        return False

    valid_mentions = {
        bot.user.mention,
        f"<@!{bot.user.id}>",
    }

    if content not in valid_mentions:
        return False

    latency_ms = round(bot.latency * 1000)

    embed = make_embed(
        title="Digital Vigital • Yes?",
        description=(
            f"{EMOJIS['green_dot']} **Status:** Fully Operational\n"
            f"{EMOJIS['ping']} **Latency:** `{latency_ms} ms`\n\n"
            f"{EMOJIS['developer']} **Developer:** "
            f"**S Y N** • [Portfolio](https://syn606.pages.dev)\n\n"
            f"{EMOJIS['arrow_point']} You pinged me. I'm here.\n"
            f"{EMOJIS['arrow_point']} Try `/help` instead of staring at me.\n"
            f"{EMOJIS['arrow_point']} I don’t bite… unless configured to."),
        level="SYSTEM",
        footer="Digital Vigital • Built different.",
    )

    embed.set_image(url=MENTION_GIF)

    try:
        await message.reply(
            embed=embed,
            view=MentionView(bot),
            mention_author=False,
        )
    except discord.HTTPException:
        pass

    return True
