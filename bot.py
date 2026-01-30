import os
import discord
from discord.ext import commands
from dotenv import load_dotenv

from db.schema import init_schema
from db.afk import get_afk, remove_afk
from utils.embeds import make_embed

# ─── Env
load_dotenv()
TOKEN = os.getenv("DISCORD_TOKEN")
if not TOKEN:
    raise RuntimeError("[ERROR] DISCORD_TOKEN not found in .env")

# ─── Intents
intents = discord.Intents.default()
intents.members = True
intents.message_content = True

# ─── Bot (dummy prefix required internally)
bot = commands.Bot(command_prefix="!", intents=intents)


# ─── Load cogs
async def load_cogs():
    for file in os.listdir("./cmd"):
        if file.endswith(".py") and not file.startswith("__"):
            ext = f"cmd.{file[:-3]}"
            await bot.load_extension(ext)
            print(f"[INFO] Loaded {ext}")


# ─── Events
@bot.event
async def on_ready():
    print(f"[INFO] Logged in as {bot.user} ({bot.user.id})") # type: ignore
    print("[INFO] Bot is online and ready")


@bot.event
async def setup_hook():
    init_schema()
    print("[INFO] Database initialized")

    await load_cogs()
    await bot.tree.sync()
    print("[INFO] Slash commands synced")


@bot.event
async def on_message(message: discord.Message):
    if message.author.bot or not message.guild:
        return

    # ── AFK mention notice
    for user in message.mentions:
        afk = get_afk(message.guild.id, user.id)
        if afk:
            embed = make_embed(
                title="User is AFK",
                description=(f"{user.mention} is currently AFK.\n"
                             f"Reason: {afk.reason}\n"
                             f"Since: <t:{afk.since}:R>"),
                level="INFO")
            await message.channel.send(embed=embed)

    # ── Remove AFK if author was AFK
    removed_afk = remove_afk(guild_id=message.guild.id,
                             user_id=message.author.id)

    if removed_afk:
        embed = make_embed(
            title="AFK Removed",
            description=("Welcome back. You are no longer marked as AFK.\n"
                         f"AFK duration: <t:{removed_afk.since}:R>"),
            level="INFO")
        await message.channel.send(embed=embed)

    # Required for internal command handling
    await bot.process_commands(message)


# ─── Entrypoint
def main():
    try:
        bot.run(TOKEN) # type: ignore
    except KeyboardInterrupt:
        print("[INFO] Shutdown requested")


if __name__ == "__main__":
    main()
