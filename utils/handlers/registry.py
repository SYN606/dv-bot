import discord
from discord.ext import commands
from utils.handlers.afk_handler import handle_afk
from utils.handlers.autoresponder_handler import handle_autoresponder
from utils.handlers.media_only import enforce_media_only
from utils.handlers.mention import handle_bot_mention
from utils.handlers.prefix import PREFIX, PREFIX_LOWER, normalize_prefix
from utils.handlers.sticky.sticky_handler import handle_sticky
from utils.handlers.vc_mod_handlers.vc_role_handler import handle_voice_state_update


# PREFIX HANDLERS
def dynamic_prefix(bot: commands.Bot, message: discord.Message):
    """Dynamically calculates the prefix for the bot command processor."""
    if not message.content:
        return commands.when_mentioned_or(PREFIX)(bot, message)

    content = message.content.lstrip()
    lowered = content.lower()

    if lowered.startswith(PREFIX_LOWER):
        actual_prefix = content[:len(PREFIX)]
        return commands.when_mentioned_or(actual_prefix)(bot, message)

    return commands.when_mentioned_or(PREFIX)(bot, message)


# MESSAGE PIPELINE INTERCEPTORS
async def process_message_interceptors(bot: discord.Client,
                                       message: discord.Message) -> bool:
    """Processes pre-command message handlers. Returns True if execution should stop early."""
    message.content = normalize_prefix(message.content)

    # 1. Block non-media messages in media channels
    if await enforce_media_only(message):
        return True

    # 2. Process sticky messages
    await handle_sticky(message)

    # 3. Process autoresponder (stops pipeline if triggered)
    if await handle_autoresponder(bot, message):
        return True

    # 4. Handle bot mentions
    if bot.user and bot.user.mentioned_in(message):
        await handle_bot_mention(bot, message)

    return False


async def process_post_command_handlers(message: discord.Message) -> None:
    """Processes post-command message handlers like AFK checks."""
    await handle_afk(message)


# CENTRAL GATEWAY DISPATCHERS
async def dispatch_voice_state_update(member: discord.Member,
                                      before: discord.VoiceState,
                                      after: discord.VoiceState) -> None:
    """Central gateway for Voice State updates."""
    if member.bot:
        return
    await handle_voice_state_update(member, before, after)


async def dispatch_message_pipeline(bot: commands.Bot,
                                    message: discord.Message) -> bool:
    """Central gateway for incoming message interceptors. Returns True if pipeline should stop."""
    if message.author.bot or not message.guild:
        return True

    return await process_message_interceptors(bot, message)


async def dispatch_post_command(message: discord.Message) -> None:
    """Central gateway for post-command execution handlers."""
    await process_post_command_handlers(message)
