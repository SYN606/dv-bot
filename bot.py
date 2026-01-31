import os
import discord
from discord.ext import commands
from dotenv import load_dotenv

from db.schema import init_schema
from db.db_helpers.afk import get_afk, remove_afk
from db.db_helpers.sticky import (
    get_sticky,
    increment_and_check,
    update_last_message,
)
from db.db_helpers.media_only import is_media_only

from utils.embeds import make_embed
from utils.interaction_check import command_toggle_check

# ─── Env
load_dotenv()
TOKEN = os.getenv("DISCORD_TOKEN")
if TOKEN is None:
    raise RuntimeError("[ERROR] DISCORD_TOKEN not found in .env")

# ─── Intents
intents = discord.Intents.default()
intents.members = True
intents.message_content = True

# ─── Bot (permanent prefix = dv)
bot = commands.Bot(
    command_prefix="dv",
    intents=intents,
    help_command=None,
)

# ─── Load cogs (cmd/ + cmd/hybrid_cmd/)
async def load_cogs():
    base_path = os.path.abspath("cmd")

    for root, _, files in os.walk(base_path):
        for file in files:
            if not file.endswith(".py") or file.startswith("__"):
                continue

            full_path = os.path.join(root, file)
            rel_path = os.path.relpath(full_path, base_path)

            module = rel_path.replace(os.sep, ".")[:-3]
            extension = f"cmd.{module}"

            await bot.load_extension(extension)
            print(f"[INFO] Loaded {extension}")

# ─── Events
@bot.event
async def on_ready():
    print(f"[INFO] Logged in as {bot.user} ({bot.user.id})")  # type: ignore
    print("[INFO] Bot is online and ready")

@bot.event
async def setup_hook():
    init_schema()
    print("[INFO] Database initialized")

    bot.tree.interaction_check = command_toggle_check

    await load_cogs()
    await bot.tree.sync()
    print("[INFO] Slash commands synced")

@bot.event
async def on_message(message: discord.Message):
    if message.author.bot or message.guild is None:
        return

    # ── PREFIX NORMALIZATION (dv / Dv / DV / dV)
    content = message.content
    stripped = content.lstrip()
    lower = stripped.lower()

    if lower.startswith("dv"):
        # find original dv length (preserve casing)
        prefix_len = 2
        rest = stripped[prefix_len:].lstrip()
        message.content = f"dv{rest}"

    # ── MEDIA-ONLY ENFORCEMENT
    if is_media_only(message.guild.id, message.channel.id):
        has_media = bool(message.attachments) or bool(message.embeds)
        if not has_media:
            try:
                await message.delete()
            except Exception:
                pass
            return

    # ── Bot mention response
    if bot.user and message.content.strip() == bot.user.mention:
        latency = round(bot.latency * 1000)
        embed = make_embed(
            title="Hello!",
            description=(
                f"Pong: **{latency}ms**\n"
                "Developed by **[SYN](https://syn606.pages.dev)**\n"
                "Use **/help** to know more"
            ),
            level="SYSTEM",
        )
        await message.channel.send(embed=embed)

    # ── Sticky message handling
    content = get_sticky(message.guild.id, message.channel.id)
    if content:
        repost, last_id = increment_and_check(
            message.guild.id,
            message.channel.id,
        )

        if repost:
            if last_id:
                try:
                    old = await message.channel.fetch_message(last_id)
                    await old.delete()
                except Exception:
                    pass

            sent = await message.channel.send(content)
            update_last_message(
                message.guild.id,
                message.channel.id,
                sent.id,
            )

    # ── AFK mention notice
    for user in message.mentions:
        afk = get_afk(message.guild.id, user.id)
        if afk:
            embed = make_embed(
                title="User is AFK",
                description=(
                    f"{user.mention} is currently AFK.\n"
                    f"Reason: {afk.reason}\n"
                    f"Since: <t:{afk.since}:R>"
                ),
                level="INFO",
            )
            await message.channel.send(embed=embed)

    # ── Remove AFK on first message
    removed_afk = remove_afk(
        guild_id=message.guild.id,
        user_id=message.author.id,
    )

    if removed_afk:
        embed = make_embed(
            title="AFK Removed",
            description=(
                "Welcome back. You are no longer marked as AFK.\n"
                f"AFK duration: <t:{removed_afk.since}:R>"
            ),
            level="INFO",
        )
        await message.channel.send(embed=embed)

    await bot.process_commands(message)

# ─── Entrypoint
def main():
    try:
        bot.run(TOKEN)
    except KeyboardInterrupt:
        print("[INFO] Shutdown requested")

if __name__ == "__main__":
    main()
