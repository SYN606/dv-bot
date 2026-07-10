import discord
from discord import app_commands
from discord.ext import commands
from typing import Literal, cast, Optional
import re

from utils.permissions.base_admin import BaseAdminCog
from utils.core.embeds import make_embed
from db.db_helpers.autoresponder import (
    upsert_autoresponder,
    delete_autoresponder,
    get_guild_autoresponders,
    add_responder_reaction,
    clear_responder_reactions,
    get_rule_by_id,  # Added helper
    update_autoresponder_rule)  # Added helper


def config_command():

    def decorator(func):
        func.config_command = True
        return func

    return decorator


class AutoResponderCommands(BaseAdminCog):

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    # Explicitly instantiate the parent slash group
    autoresponder_group = app_commands.Group(
        name="autoresponder",
        description="Manage the server autoresponder processing matrix.")

    # --- SUBCOMMANDS ---

    @autoresponder_group.command(
        name="add",
        description=
        "Create or update an active autoresponder rule configuration.")
    @config_command()
    async def ar_add(self,
                     interaction: discord.Interaction,
                     trigger: app_commands.Range[str, 1, 256],
                     match_type: Literal["exact", "contains", "startswith",
                                         "endswith", "regex"],
                     reply: Optional[str] = None,
                     embed_title: Optional[str] = None,
                     image_url: Optional[str] = None,
                     reactions: Optional[str] = None,
                     delete_trigger: bool = False,
                     cooldown: int = 0):
        await interaction.response.defer(ephemeral=True)
        guild = cast(discord.Guild, interaction.guild)

        if not reply and not reactions and not embed_title:
            await interaction.followup.send(embed=make_embed(
                title="Invalid Setup",
                description=
                "You must provide at least a text `reply`, an `embed_title`, or an emoji `reactions` payload.",
                level="ERROR"))
            return

        if match_type == "regex":
            try:
                re.compile(trigger)
            except re.error as e:
                await interaction.followup.send(embed=make_embed(
                    title="Regex Validation Error",
                    description=
                    f"The regular expression string provided is invalid:\n`{e}`",
                    level="ERROR"))
                return

        try:
            responder_id = await upsert_autoresponder(
                guild_id=guild.id,
                trigger_phrase=trigger,
                match_type=match_type,
                reply_content=reply,
                is_embed=bool(embed_title),
                embed_title=embed_title,
                image_url=image_url,
                delete_trigger=delete_trigger,
                cooldown=max(0, cooldown),
                enabled=True)

            if reactions:
                await clear_responder_reactions(responder_id)
                parsed_emojis = [
                    e.strip() for e in re.split(r'[,\s]+', reactions)
                    if e.strip()
                ]
                for emo in parsed_emojis:
                    await add_responder_reaction(responder_id, emo)

            desc = f"Successfully registered **ID: {responder_id}**\n• **Trigger:** `{trigger}`\n• **Match Mode:** `{match_type}`"
            await interaction.followup.send(
                embed=make_embed(title="Autoresponder Registered",
                                 description=desc,
                                 level="SUCCESS"))

        except Exception as e:
            await interaction.followup.send(embed=make_embed(
                title="Execution Error",
                description=f"Failed to record setting structure: {e}",
                level="ERROR"))

    @autoresponder_group.command(
        name="edit",
        description=
        "Modify properties for an existing autoresponder configuration profile."
    )
    @app_commands.describe(
        rule_id="The unique reference integer ID of the autoresponder target.",
        trigger=
        "Update the string or regular expression pattern mapped to matches.",
        match_type="Modify matching parsing strategy types.",
        reply="The new text string payload executed downstream.",
        embed_title=
        "Set or overwrite custom visual title lines used inside embed envelopes.",
        image_url=
        "Change target image files or asset strings nested inside embeds. Use 'none' to remove.",
        reactions=
        "Comma or space separated emojis list to append as auto-reactions.",
        delete_trigger=
        "Toggle whether the initial message is stripped out of chat.",
        cooldown="Enforce active user execution cooling windows in seconds.",
        enabled=
        "Toggle if this specific rule should actively intercept text patterns."
    )
    @config_command()
    async def ar_edit(self,
                      interaction: discord.Interaction,
                      rule_id: int,
                      trigger: Optional[str] = None,
                      match_type: Optional[Literal["exact", "contains",
                                                   "startswith", "endswith",
                                                   "regex"]] = None,
                      reply: Optional[str] = None,
                      embed_title: Optional[str] = None,
                      image_url: Optional[str] = None,
                      reactions: Optional[str] = None,
                      delete_trigger: Optional[bool] = None,
                      cooldown: Optional[int] = None,
                      enabled: Optional[bool] = None):
        await interaction.response.defer(ephemeral=True)
        guild = cast(discord.Guild, interaction.guild)

        # 1. Verification Phase: Confirm existence and server ownership
        rule = await get_rule_by_id(rule_id)
        if not rule or rule.guild_id != guild.id:
            await interaction.followup.send(embed=make_embed(
                title="Profile Access Error",
                description=
                f"No configuration profile matches registration identifier ID: `{rule_id}`.",
                level="ERROR"))
            return

        # 2. Advanced Regex Integrity Checks
        target_match = match_type or rule.match_type
        target_trigger = trigger if trigger is not None else rule.trigger_phrase
        if target_match == "regex":
            try:
                re.compile(target_trigger)
            except re.error as e:
                await interaction.followup.send(embed=make_embed(
                    title="Regex Validation Error",
                    description=
                    f"The updated regular expression configuration is structurally invalid:\n`{e}`",
                    level="ERROR"))
                return

        # 3. Compile selectively configured modifications matrix
        updates = {}
        if trigger is not None:
            updates["trigger_phrase"] = trigger
        if match_type is not None:
            updates["match_type"] = match_type
        if reply is not None:
            updates["reply_content"] = reply
        if embed_title is not None:
            updates["embed_title"] = embed_title
            updates["is_embed"] = True
        if image_url is not None:
            updates["image_url"] = None if image_url.lower(
            ) == "none" else image_url
        if delete_trigger is not None:
            updates["delete_trigger"] = delete_trigger
        if cooldown is not None:
            updates["cooldown"] = max(0, cooldown)
        if enabled is not None:
            updates["enabled"] = enabled

        # 4. Process secondary payload relationships (Reactions Mapping Architecture)
        reactions_changed = False
        if reactions is not None:
            reactions_changed = True
            await clear_responder_reactions(rule_id)
            if reactions.strip() and reactions.lower() != "none":
                parsed_emojis = [
                    e.strip() for e in re.split(r'[,\s]+', reactions)
                    if e.strip()
                ]
                for emo in parsed_emojis:
                    await add_responder_reaction(rule_id, emo)

        # Fail-safe gate if nothing was modified
        if not updates and not reactions_changed:
            await interaction.followup.send(embed=make_embed(
                title="Configuration Unchanged",
                description=
                "You must select at least one optional parameter criteria to modify.",
                level="WARNING"))
            return

        # 5. Serialize data structures downstream via DB Layer
        try:
            if updates:
                await update_autoresponder_rule(rule_id=rule_id,
                                                guild_id=guild.id,
                                                **updates)

            # Compile visual diagnostics log payload for client display
            changes_report = []
            for key, val in updates.items():
                changes_report.append(f"• **{key}**: `{val}`")
            if reactions_changed:
                changes_report.append(f"• **reactions**: `{reactions}`")

            await interaction.followup.send(embed=make_embed(
                title="Configuration Synchronized",
                description=
                f"Autoresponder profile record `#{rule_id}` has been cleanly customized.\n\n### Applied Changes Matrix:\n"
                + "\n".join(changes_report),
                level="SUCCESS"))

        except Exception as e:
            await interaction.followup.send(embed=make_embed(
                title="Execution Error",
                description=
                f"Failed to save changes to persistence engine: {e}",
                level="ERROR"))

    @autoresponder_group.command(
        name="remove",
        description=
        "Delete an active autoresponder rule sequence using its Unique ID.")
    @config_command()
    async def ar_remove(self, interaction: discord.Interaction, rule_id: int):
        await interaction.response.defer(ephemeral=True)
        guild = cast(discord.Guild, interaction.guild)

        success = await delete_autoresponder(guild_id=guild.id,
                                             responder_id=rule_id)
        if success:
            await interaction.followup.send(embed=make_embed(
                title="Rule Dropped",
                description=
                f"Autoresponder sequence index rule ID `{rule_id}` has been cleared from memory registers.",
                level="SUCCESS"))
        else:
            await interaction.followup.send(embed=make_embed(
                title="Not Found",
                description=
                f"Could not locate an active autoresponder with ID `{rule_id}` owned by this server.",
                level="ERROR"))

    @autoresponder_group.command(
        name="list",
        description=
        "Display all custom autoresponder execution logs configured for this server."
    )
    @config_command()
    async def ar_list(self, interaction: discord.Interaction):
        await interaction.response.defer(ephemeral=False)
        guild = cast(discord.Guild, interaction.guild)

        records = await get_guild_autoresponders(guild_id=guild.id,
                                                 enabled_only=False)
        if not records:
            await interaction.followup.send(embed=make_embed(
                title="Database Empty",
                description=
                "This server hasn't configured any custom autoresponders yet.",
                level="INFO"))
            return

        embed = make_embed(
            title=f"🤖 {guild.name} Autoresponders",
            description="Active parsing triggers list configuration matrix:",
            level="INFO")

        for ar, emojis in records[:25]:
            emoji_str = " ".join(emojis) if emojis else "None"
            status = "🟢" if ar.enabled else "🔴"

            value_summary = (
                f"• **Type:** `{ar.match_type}`\n"
                f"• **Reply:** {f'`{ar.reply_content[:60]}...`' if ar.reply_content else '*Embed Card Link*' if ar.is_embed else '*Reactions Only*'}\n"
                f"• **Reactions:** {emoji_str}\n"
                f"• **Del Trigger:** `{ar.delete_trigger}`")
            embed.add_field(
                name=
                f"{status} ID: {ar.responder_id} | Trigger: \"{ar.trigger_phrase}\"",
                value=value_summary,
                inline=False)

        await interaction.followup.send(embed=embed)


async def setup(bot: commands.Bot) -> None:
    await bot.add_cog(AutoResponderCommands(bot))
