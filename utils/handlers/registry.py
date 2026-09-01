from __future__ import annotations

import discord
from discord.ext import commands

from utils.handlers.afk._afk_nicknames import handle_afk
from utils.handlers.analytics_handler import (
    handle_analytics_join,
    handle_analytics_leave,
    handle_analytics_message,
    handle_analytics_voice_state,
)
from utils.handlers.autoresponder_handler import handle_autoresponder
from utils.handlers.media_only import enforce_media_only
from utils.handlers.mention import handle_bot_mention
from utils.handlers.prefix import (
    PREFIX,
    PREFIX_LOWER,
    dynamic_prefix,
    normalize_prefix,
    preprocess_message,
)
from utils.handlers.sticky.sticky_handler import handle_sticky
from utils.handlers.vc_mod_handlers.vc_role_handler import handle_voice_state_update


# --- MESSAGE PIPELINE INTERCEPTORS ---
async def process_message_interceptors(
    bot: discord.Client,
    message: discord.Message,
) -> bool:
    """Processes pre-command message handlers. Returns True if execution should stop early."""

    # 1. Track message analytics
    await handle_analytics_message(message)

    # 2. Block non-media messages in media channels
    if await enforce_media_only(message):
        return True

    # 3. Process AFK (Mentions notification & status removal on speak)
    await handle_afk(message)

    # 4. Process sticky messages
    await handle_sticky(message)

    # 5. Process autoresponder
    if await handle_autoresponder(bot, message):
        return True

    # 6. Handle direct bot mentions (Only trigger if the bot is explicitly mentioned in the content)
    if bot.user and bot.user.mentioned_in(message):
        # Prevent `@everyone` or `@here` from triggering false positives
        if f"<@{bot.user.id}>" in message.content or f"<@!{bot.user.id}>" in message.content:
            await handle_bot_mention(bot, message)

    return False


async def process_post_command_handlers(message: discord.Message) -> None:
    """Processes post-command message handlers (kept for future extensions)."""
    pass


# --- DISPATCHERS ---


async def dispatch_member_join(member: discord.Member) -> None:
    """Central gateway for member join events."""
    if member.bot:
        return
    await handle_analytics_join(member)


async def dispatch_member_remove(member: discord.Member) -> None:
    """Central gateway for member leave events."""
    if member.bot:
        return
    await handle_analytics_leave(member)


async def dispatch_voice_state_update(
    member: discord.Member,
    before: discord.VoiceState,
    after: discord.VoiceState,
) -> None:
    """Central gateway for Voice State updates."""
    if member.bot:
        return

    await handle_analytics_voice_state(member, before, after)
    await handle_voice_state_update(member, before, after)


async def dispatch_message_pipeline(
    bot: commands.Bot,
    message: discord.Message,
) -> bool:
    """Central gateway for incoming message interceptors. Returns True if pipeline should stop."""
    if message.author.bot or not message.guild:
        return True

    # Normalize prefix (converts 'DV help', 'Dvhelp', 'dv  help' to 'dvhelp')
    await preprocess_message(bot, message)

    return await process_message_interceptors(bot, message)


async def dispatch_post_command(message: discord.Message) -> None:
    """Central gateway for post-command execution handlers."""
    await process_post_command_handlers(message)
