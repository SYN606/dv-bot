from __future__ import annotations
import asyncio
import re
import discord
from discord import Message
from typing import Dict, Tuple
from utils.core.embeds import make_embed
from db.db_helpers.autoresponder import get_guild_autoresponders

_ar_user_cooldowns: Dict[Tuple[int, int, int], float] = {}


async def handle_autoresponder(bot: discord.Client, message: Message) -> bool:
    if bot.user is None or message.author.bot or message.webhook_id:
        return False

    if message.type != discord.MessageType.default or not message.guild:
        return False

    guild_id = message.guild.id
    content = message.content.strip()
    if not content:
        return False

    active_rules = await get_guild_autoresponders(guild_id=guild_id,
                                                  enabled_only=True)
    if not active_rules:
        return False

    for rule, emojis in active_rules:
        matched = False
        match_type = rule.match_type.lower()
        trigger = rule.trigger_phrase

        if match_type == "exact":
            matched = (content.lower() == trigger.lower())
        elif match_type == "contains":
            matched = (trigger.lower() in content.lower())
        elif match_type == "startswith":
            matched = content.lower().startswith(trigger.lower())
        elif match_type == "endswith":
            matched = content.lower().endswith(trigger.lower())
        elif match_type == "regex":
            try:
                pattern = re.compile(trigger, re.IGNORECASE)
                matched = bool(pattern.search(content))
            except re.error:
                continue

        if not matched:
            continue

        if rule.cooldown > 0:
            now = asyncio.get_running_loop().time()
            cooldown_key = (guild_id, rule.responder_id, message.author.id)
            last_triggered = _ar_user_cooldowns.get(cooldown_key, 0.0)
            if now - last_triggered < rule.cooldown:
                return True
            _ar_user_cooldowns[cooldown_key] = now

        if emojis and not rule.delete_trigger:
            for emoji_str in emojis:
                try:
                    if ":" in emoji_str:
                        emoji_id = int(
                            emoji_str.split(":")[-1].replace(">", ""))
                        actual_emoji = bot.get_emoji(emoji_id)
                        if actual_emoji:
                            await message.add_reaction(actual_emoji)
                    else:
                        await message.add_reaction(emoji_str)
                except (discord.Forbidden, discord.NotFound,
                        discord.HTTPException):
                    break

        if rule.reply_content or rule.embed_title:
            raw_text = rule.reply_content or ""
            formatted_text = raw_text.replace("{user}",
                                              message.author.mention).replace(
                                                  "{server}",
                                                  message.guild.name)

            try:
                if rule.is_embed and rule.embed_title:
                    formatted_title = rule.embed_title.replace(
                        "{user}", message.author.name)
                    embed = make_embed(title=formatted_title,
                                       description=formatted_text,
                                       level="INFO")
                    if rule.image_url:
                        embed.set_image(url=rule.image_url)

                    if rule.delete_trigger:
                        await message.channel.send(embed=embed)
                    else:
                        await message.reply(embed=embed, mention_author=False)
                else:
                    if rule.delete_trigger:
                        await message.channel.send(content=formatted_text)
                    else:
                        await message.reply(content=formatted_text,
                                            mention_author=False)
            except (discord.Forbidden, discord.HTTPException):
                pass

        if rule.delete_trigger:
            try:
                await message.delete()
            except (discord.Forbidden, discord.NotFound,
                    discord.HTTPException):
                pass
        return True
    return False
