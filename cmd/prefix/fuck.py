import random
import time
from typing import Optional

import discord
from discord.ext import commands

from db.static_db.roasts import ROASTS

USER_STATE: dict[int, dict] = {}

GLOBAL_COOLDOWN = 3

_global_last_used: dict[int, float] = {}


def weighted_choice(items):

    if isinstance(items, list):
        return random.choice(items)

    expanded = []

    for key, weight in items.items():

        expanded.extend([key] * weight)

    return random.choice(expanded)


def get_power(member: discord.Member) -> int:

    power = 0

    # owner bonus
    if member.id == member.guild.owner_id:
        power += 10000

    # admin permissions
    if member.guild_permissions.administrator:
        power += 500

    # moderation permissions
    if member.guild_permissions.manage_guild:
        power += 150

    if member.guild_permissions.manage_roles:
        power += 120

    if member.guild_permissions.manage_messages:
        power += 80

    if member.guild_permissions.kick_members:
        power += 50

    if member.guild_permissions.ban_members:
        power += 50

    if member.guild_permissions.moderate_members:
        power += 40

    # role position
    power += member.top_role.position * 2

    # boost for dangerous users
    if member.premium_since:
        power += 15

    return power


def update_state(
    user_id: int,
    target_id: int,
):

    state = USER_STATE.setdefault(
        user_id,
        {
            "count": 0,
            "combo": 0,
            "toxicity": 0,
            "last_target": None,
            "last_used": 0,
            "reverse_hits": 0,
            "fatal_hits": 0,
        },
    )

    now = time.time()

    # combo tracking
    if now - state["last_used"] < 20:

        state["combo"] += 1

    else:

        state["combo"] = 0

    # toxicity tracking
    if state["last_target"] == target_id:

        state["toxicity"] += 1

    else:

        state["toxicity"] = max(
            0,
            state["toxicity"] - 1,
        )

    state["count"] += 1

    state["last_target"] = target_id

    state["last_used"] = now

    return state


def pick_style(state: dict) -> str:

    count = state["count"]

    toxicity = state["toxicity"]

    if toxicity >= 7:
        return "dark"

    if count >= 12:
        return "dark"

    if count >= 5:
        return "sarcastic"

    return "normal"


async def analyze_user(
    ctx: commands.Context,
    target: discord.Member,
) -> str:

    messages = []

    async for msg in ctx.channel.history(limit=60):

        if msg.author.id != target.id:
            continue

        if not msg.content:
            continue

        messages.append(msg.content.lower())

        if len(messages) >= 15:
            break

    if not messages:
        return "default"

    text = " ".join(messages)

    words = text.split()

    unique_words = len(set(words))

    # dry user
    if len(text) < 25:
        return "dry"

    # repetitive
    if len(words) / max(unique_words, 1) > 2.7:
        return "repetitive"

    # npc detection
    if any(word in text for word in [
            "lol",
            "lmao",
            "xd",
            "haha",
            "bro",
            "fr",
            "real",
    ]):
        return "npc"

    # overthinker
    if len(text) > 350:
        return "overthink"

    # motivational sigma
    if any(word in text for word in [
            "sigma",
            "mindset",
            "grind",
            "discipline",
            "hustle",
    ]):
        return "motivation"

    # discord kitten
    if any(word in text for word in [
            "uwu",
            "owo",
            ":3",
            "mrrp",
    ]):
        return "discord_kitten"

    # aggressive
    if text.isupper():
        return "aggressive"

    # confused
    if text.count("?") >= 5:
        return "confused"

    # gamer
    if any(word in text for word in [
            "ez",
            "skill issue",
            "ranked",
            "clutch",
            "top frag",
    ]):
        return "gamer"

    return "default"


def build_roast(
    level: int,
    context: str,
    style: str,
) -> str:

    openings = list(ROASTS["openings"])

    base_pool = list(ROASTS.get(
        context,
        ROASTS["default"],
    ))

    # sarcastic mode
    if style == "sarcastic":

        base_pool.extend([
            "career definitely stable lag raha hai.",
            "future bright hai bas light band hai.",
            "confidence illegal level ka hai.",
            "ye sab voluntarily kar raha hai 😭",
        ])

    # dark mode
    elif style == "dark":

        base_pool.extend([
            "ye phase lamba chalne wala hai.",
            "recovery impossible lag rahi hai.",
            "future observer mode me hai.",
            "damage permanent lag raha hai.",
        ])

    # kill pools
    if level < 3:

        kill_pool = ROASTS["kill_low"]

    elif level < 7:

        kill_pool = ROASTS["kill_mid"]

    else:

        kill_pool = ROASTS["kill_high"]

    # rare fatal roast
    if random.random() < 0.02:

        return weighted_choice(ROASTS["fatal"])

    parts = [
        weighted_choice(openings),
        weighted_choice(base_pool),
        weighted_choice(kill_pool),
    ]

    # random shortening
    if random.random() < 0.25:

        parts.pop(random.randrange(len(parts)))

    return " ".join(parts)


class Savage(commands.Cog):

    def __init__(
        self,
        bot: commands.Bot,
    ):

        self.bot = bot

    async def get_target(
        self,
        ctx: commands.Context,
        member: Optional[discord.Member] = None,
    ):

        if member:
            return member

        # reply target
        if ctx.message.reference:

            try:

                replied = await ctx.channel.fetch_message(
                    ctx.message.reference.message_id) # type: ignore

                if isinstance(
                        replied.author,
                        discord.Member,
                ):
                    return replied.author

            except Exception:
                pass

        return ctx.author

    @commands.command(
        name="fuck",
        aliases=[
            "roast",
            "cook",
            "destroy",
        ],
        help="Generate a dynamic roast",
    )
    @commands.guild_only()
    @commands.cooldown(
        1,
        4,
        commands.BucketType.user,
    )
    async def fuck(
        self,
        ctx: commands.Context,
        member: Optional[discord.Member] = None,
    ):

        if ctx.guild is None:
            return

        # global cooldown
        guild_id = ctx.guild.id

        now = time.time()

        last = _global_last_used.get(
            guild_id,
            0,
        )

        remaining = GLOBAL_COOLDOWN - (now - last)

        if remaining > 0:

            await ctx.reply(
                f"cooldown active • `{remaining:.1f}s`",
                mention_author=False,
            )

            return

        _global_last_used[guild_id] = now

        author = ctx.author

        target = await self.get_target(
            ctx,
            member,
        )

        state = update_state(
            author.id,
            target.id,
        )

        level = state["count"]

        style = pick_style(state)

        # self roast
        if target.id == author.id:

            self_roasts = [
                "khud pe hi command use kar diya 💀",
                "andar se toot chuka hai kya.",
                "self destruction arc chal raha hai.",
                "therapy cheaper padti shayad.",
                "enemy detect nahi hua toh khud pe chala diya 😭",
            ]

            await ctx.reply(
                random.choice(self_roasts),
                mention_author=False,
            )

            return

        # bot protection
        if target.bot:

            bot_roasts = [
                "bots ko bhi nahi chhod raha 😭",
                "machine pe dominance dikha raha hai.",
                "AI oppression chal raha hai.",
            ]

            await ctx.reply(
                random.choice(bot_roasts),
                mention_author=False,
            )

            return

        # anti harassment
        if state["toxicity"] >= 8:

            await ctx.reply(
                "bhai usko chain se jeene de 😭",
                mention_author=False,
            )

            return

        # hierarchy logic
        author_power = get_power(author) # type: ignore

        target_power = get_power(target) # type: ignore

        power_gap = target_power - author_power

        # owner/final boss
        if power_gap >= 5000:

            reverse = ("server ke final boss pe command use kar diya. " +
                       build_roast(
                           level,
                           "default",
                           "dark",
                       ))

            state["reverse_hits"] += 1

            await ctx.reply(
                reverse,
                mention_author=False,
            )

            return

        # admin reverse
        if power_gap >= 500:

            reverse = ("authority difference zyada tha. " + build_roast(
                level,
                "default",
                "sarcastic",
            ))

            state["reverse_hits"] += 1

            await ctx.reply(
                reverse,
                mention_author=False,
            )

            return

        # role reverse chance
        if (power_gap >= 80 and random.random() < 0.65):

            reverse = ("ulta expose ho gaya 😭 " + build_roast(
                level,
                "default",
                "normal",
            ))

            state["reverse_hits"] += 1

            await ctx.reply(
                reverse,
                mention_author=False,
            )

            return

        # analyze target
        context = await analyze_user(
            ctx,
            target, # type: ignore
        )

        roast = build_roast(
            level,
            context,
            style,
        )

        # combo escalation
        if state["combo"] >= 5:

            roast += (" obsession thodi kam kar.")

        # toxicity escalation
        if state["toxicity"] >= 4:

            roast += (" ek hi bande pe focused hai 😭")

        # random response styles
        mode = random.randint(1, 7)

        if mode == 1:

            final = roast

        elif mode == 2:

            final = (f"honestly? {roast}")

        elif mode == 3:

            final = (f"{target.mention} "
                     f"recover kar paega kya isse 💀\n\n"
                     f"{roast}")

        elif mode == 4:

            final = random.choice([
                "crazy work.",
                "disaster behavior.",
                "unemployed activities.",
                "confidence unmatched.",
                "catastrophic performance.",
            ])

        elif mode == 5:

            final = roast.upper()

        elif mode == 6:

            final = (f"{target.mention} "
                     f"caught a fatal hit 😭\n"
                     f"{roast}")

        else:

            final = (f"analysis complete:\n{roast}")

        await ctx.reply(
            final,
            mention_author=False,
        )


async def setup(bot: commands.Bot):

    await bot.add_cog(Savage(bot))
