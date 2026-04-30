import random
import discord
from discord.ext import commands

from utils.core.embeds import make_embed

# =========================================================
# MEMORY (ESCALATION)
# =========================================================
USER_ROAST_LEVEL: dict[int, int] = {}


# =========================================================
# ANALYZE MESSAGES
# =========================================================
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

    # simple signals
    if len(text) < 30:
        return "dry"

    if len(set(text.split())) < 10:
        return "repetitive"

    if any(w in text for w in ["lol", "lmao", "xd", "haha"]):
        return "npc"

    if len(text) > 200:
        return "overthink"

    return "default"


# =========================================================
# ROAST GENERATOR
# =========================================================
def generate_roast(level: int, context: str) -> str:

    openings = [
        "sach bolu?",
        "real talk—",
        "ek baat clear hai—",
    ]

    # context-based hits
    if context == "repetitive":
        hit = [
            "same baat baar baar bol raha hai… kuch naya try kar.",
            "lagta hai ek hi line pe atka hua hai.",
        ]
    elif context == "npc":
        hit = [
            "har message same template jaisa lagta hai.",
            "reaction zyada, content kam.",
        ]
    elif context == "overthink":
        hit = [
            "itna likhne ke baad bhi point clear nahi hai.",
            "zyada bol raha hai… par keh kuch nahi raha.",
        ]
    elif context == "dry":
        hit = [
            "itna silent rehta hai ki presence doubtful lagti hai.",
            "conversation me hai ya nahi, samajh nahi aata.",
        ]
    else:
        hit = [
            "effort dikh raha hai… par direction missing hai.",
            "confidence hai… par base weak lag raha hai.",
        ]

    # escalation kill
    if level < 2:
        kill = [
            "bas wahi issue hai.",
            "samajh aa raha hoga.",
        ]
    elif level < 5:
        kill = [
            "aur wahi sabko dikh raha hai.",
            "aur wahi repeat ho raha hai.",
        ]
    else:
        kill = [
            "aur honestly, change bhi nahi ho raha.",
            "aur ye expected hi tha.",
        ]

    return f"{random.choice(openings)}\n\n{random.choice(hit)}\n\n{random.choice(kill)}"


# =========================================================
# COG
# =========================================================
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

        # escalation
        level = USER_ROAST_LEVEL.get(author.id, 0)
        USER_ROAST_LEVEL[author.id] = level + 1

        # analyze messages
        context = await analyze_user(ctx, target)

        roast = generate_roast(level, context)

        embed = make_embed(
            title="Savage Mode",
            description=roast,
            level="WARNING",
        )

        await ctx.send(embed=embed)


async def setup(bot: commands.Bot):
    await bot.add_cog(Savage(bot))
