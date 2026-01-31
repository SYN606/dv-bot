from discord import Message
from utils.embeds import make_embed


async def handle_bot_mention(bot, message: Message):
    if not bot.user:
        return False

    if message.content.strip() != bot.user.mention:
        return False

    latency = round(bot.latency * 1000)
    embed = make_embed(
        title="Hello!",
        description=(f"Pong: **{latency}ms**\n"
                     "Developed by **[SYN](https://syn606.pages.dev)**\n"
                     "Use **/help** to know more"),
        level="SYSTEM",
    )
    await message.channel.send(embed=embed)
    return True
