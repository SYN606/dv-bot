from discord import Message

from utils.embeds import make_embed
from utils.emojis import EMOJIS


async def handle_bot_mention(bot, message: Message) -> bool:
    if not bot.user:
        return False

    if message.content.strip() != bot.user.mention:
        return False

    latency = round(bot.latency * 1000)

    embed = make_embed(
        title="Digital Vigital",
        description=
        (f"{EMOJIS['ping']} **Latency:** {latency} ms\n"
         f"{EMOJIS['developer']} **Developer:** "
         f"[SYN](https://syn606.pages.dev)\n\n"
         f"{EMOJIS['arrow_point']} Use **/help** to explore commands\n"
         f"{EMOJIS['arrow_point']} Most features work via **slash commands (`/`)**"
         ),
        level="SYSTEM",
        footer="Mention me anytime for quick status",
    )

    await message.channel.send(embed=embed)
    return True
