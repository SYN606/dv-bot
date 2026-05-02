import random
import discord
from discord.ext import commands

from db.static_db.roasts import ROASTS

# MEMORY
USER_STATE: dict[int, dict] = {}


# ANALYZE USER
async def analyze_user(ctx: commands.Context, target: discord.Member):

    messages = []
    async for msg in ctx.channel.history(limit=30):
        if msg.author.id == target.id:
            messages.append(msg.content.lower())
        if len(messages) >= 10:
            break

    if not messages:
        return "default"

    text = " ".join(messages)

    if len(text) < 30:
        return "dry"

    if len(set(text.split())) < 10:
        return "repetitive"

    if any(w in text for w in ["lol", "lmao", "xd", "haha"]):
        return "npc"

    if len(text) > 200:
        return "overthink"

    return "default"


def pick_style(user_id: int) -> str:
    state = USER_STATE.setdefault(user_id, {"count": 0})

    state["count"] += 1
    count = state["count"]

    if count > 6:
        return "dark"
    if count > 3:
        return "sarcastic"
    return "normal"


def weighted_choice(items):
    if isinstance(items, list):
        return random.choice(items)

    expanded = []
    for k, w in items.items():
        expanded.extend([k] * w)
    return random.choice(expanded)


def build_roast(level: int, context: str, style: str) -> str:

    openings = ROASTS["openings"]

    base_pool = list(ROASTS.get(context, ROASTS["default"]))

    if style == "sarcastic":
        base_pool.extend([
            "haan haan perfect chal raha hai sab.",
            "bilkul sahi direction me ja raha hai tu.",
        ])

    elif style == "dark":
        base_pool.extend([
            "thoda late realise karega ye sab.",
            "ye pattern break hone wala nahi lag raha.",
        ])

    if level < 2:
        kill_pool = ROASTS["kill_low"]
    elif level < 5:
        kill_pool = ROASTS["kill_mid"]
    else:
        kill_pool = ROASTS["kill_high"]

    if level >= 4 and random.random() < 0.12:
        return weighted_choice(ROASTS["fatal"])

    parts = [
        weighted_choice(openings),
        weighted_choice(base_pool),
        weighted_choice(kill_pool),
    ]

    if random.random() < 0.25:
        parts.pop(random.randrange(len(parts)))

    return " ".join(parts)


class Savage(commands.Cog):

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    async def get_target(self, ctx, member=None):
        if member:
            return member

        if ctx.message.reference:
            try:
                msg = await ctx.channel.fetch_message(
                    ctx.message.reference.message_id)
                if isinstance(msg.author, discord.Member):
                    return msg.author
            except Exception:
                pass

        return ctx.author

    @commands.command(name="fuck")
    async def fuck(self, ctx, member: discord.Member = None):  # type: ignore

        if ctx.guild is None:
            return

        author = ctx.author
        target = await self.get_target(ctx, member)

        user_state = USER_STATE.setdefault(author.id, {"count": 0})
        level = user_state["count"]

        if target.id == ctx.guild.owner_id and target != author:
            roast = "galat jagah try kiya. " + build_roast(
                level, "default", "dark")
            await ctx.reply(roast, mention_author=False)
            return

        if (isinstance(target, discord.Member)
                and target.guild_permissions.administrator
                and not author.guild_permissions.administrator):
            roast = "admin pe try kiya. ulta pad gaya. " + build_roast(
                level, "default", "dark")
            await ctx.reply(roast, mention_author=False)
            return

        if (target != author and isinstance(target, discord.Member)
                and target.top_role > author.top_role):
            roast = "reverse ho gaya. " + build_roast(level, "default", "dark")
            await ctx.reply(roast, mention_author=False)
            return

        context = await analyze_user(ctx, target)
        style = pick_style(author.id)

        roast = build_roast(level, context, style)

        await ctx.reply(roast, mention_author=False)


async def setup(bot: commands.Bot):
    await bot.add_cog(Savage(bot))
