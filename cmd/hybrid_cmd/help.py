from __future__ import annotations
import os
import time
from dotenv import load_dotenv
import discord
from discord import app_commands
from discord.ext import commands
from utils.core.embeds import make_embed
from utils.core.emojis import EMOJIS
from utils.permissions.check_perms import is_bot_admin, is_bot_admin_ctx
from utils.permissions.protected_commands import PROTECTED_COMMANDS
from db.db_helpers.channel_command_restrict import get_restricted_commands

load_dotenv()
BANNER_GIF = os.getenv("HELP_BANNER_GIF")

COMMAND_CATEGORIES: dict[str, str] = {
    "ban": "Moderation",
    "kick": "Moderation",
    "tempban": "Moderation",
    "timeout": "Moderation",
    "purge": "Moderation",
    "lockdown": "Moderation",
    "verification": "Verification",
    "roles": "Roles",
    "adminrole": "Roles",
    "help": "System",
    "command": "System",
    "ping": "Utility",
    "avatar": "Utility",
    "banner": "Utility",
    "server_info": "Utility",
    "shards": "Utility",
    "afk": "Utility",
    "vc_manager": "Voice",
    "drag": "Voice",
    "moveall": "Voice"
}

CATEGORY_EMOJIS = {
    "Moderation": EMOJIS.get("moderation", "🛡️"),
    "Verification": EMOJIS.get("okay", "✅"),
    "Roles": EMOJIS.get("green_dot", "🟢"),
    "System": EMOJIS.get("developer", "⚙️"),
    "Utility": EMOJIS.get("ping", "⚡"),
    "Voice": "🎧",
    "General": EMOJIS.get("arrow_point", "🔹")
}


class HelpDropdown(discord.ui.Select):

    def __init__(self, categories: list[str],
                 grouped_commands: dict[str, list[dict]], author_id: int):
        self.grouped_commands = grouped_commands
        self.author_id = author_id

        options = [
            discord.SelectOption(
                label=cat,
                emoji=CATEGORY_EMOJIS.get(cat, "🔹"),
                description=f"View commands inside {cat} module.")
            for cat in categories if cat in grouped_commands
        ]
        super().__init__(placeholder="📂 Select a category to explore...",
                         min_values=1,
                         max_values=1,
                         options=options)

    async def callback(self, interaction: discord.Interaction):
        if interaction.user.id != self.author_id:
            await interaction.response.send_message(embed=make_embed(
                title="Access Denied",
                description="You cannot interact with this menu.",
                level="ERROR"),
                                                    ephemeral=True)
            return

        cat = self.values[0]
        cmds = self.grouped_commands[cat]

        desc = f"### {CATEGORY_EMOJIS.get(cat, '🔹')} {cat} Commands\n"
        for c in cmds:
            desc += f"🔹 `/{c['qualified']}`\n> {c['description']}\n\n"

        embed = make_embed(title="Help Center Directory",
                           description=desc,
                           level="INFO")
        if BANNER_GIF: embed.set_image(url=BANNER_GIF)
        embed.set_footer(
            text="Digital Vigital • Use menu to switch categories",
            icon_url=interaction.user.display_avatar.url)

        await interaction.response.edit_message(embed=embed)


class HelpDropdownView(discord.ui.View):

    def __init__(self, categories: list[str],
                 grouped_commands: dict[str, list[dict]], author_id: int):
        super().__init__(timeout=60)
        self.message: discord.Message | None = None
        self.add_item(HelpDropdown(categories, grouped_commands, author_id))

    async def on_timeout(self) -> None:
        for item in self.children:
            if isinstance(item, discord.ui.Select): item.disabled = True
        if self.message:
            try:
                await self.message.edit(view=self)
            except (discord.NotFound, discord.Forbidden,
                    discord.HTTPException):
                pass


class Help(commands.Cog):

    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self._cache: list[dict] = []

    def build_cache(self):
        cache = []
        for cmd in self.bot.tree.walk_commands():
            if not isinstance(cmd, app_commands.Command): continue
            base = cmd.name.lower()
            cache.append({
                "qualified": cmd.qualified_name.lower(),
                "base": base,
                "description": cmd.description or "No description provided.",
                "category": COMMAND_CATEGORIES.get(base, "General")
            })
        self._cache = sorted(cache,
                             key=lambda x: (x["category"], x["qualified"]))

    @commands.Cog.listener()
    async def on_ready(self):
        self.build_cache()

    async def _get_authorized_commands(
            self, user_id: int, guild: discord.Guild | None,
            channel: discord.abc.GuildChannel | None,
            is_admin: bool) -> dict[str, list[dict]]:
        restricted: set[str] = set()
        if guild and channel:
            try:
                restricted = set(await
                                 get_restricted_commands(guild.id, channel.id))
            except Exception:
                pass

        grouped: dict[str, list[dict]] = {}
        for cmd in self._cache:
            if cmd["base"] in restricted and not is_admin: continue
            if cmd["qualified"] in PROTECTED_COMMANDS and not is_admin:
                continue
            grouped.setdefault(cmd["category"], []).append(cmd)
        return grouped

    @commands.hybrid_command(
        name="help",
        description=
        "Show structured and filtered interactive bot command directory.")
    @commands.cooldown(1, 3, commands.BucketType.user)
    async def help(self, ctx: commands.Context):
        is_admin = False
        if ctx.guild:
            try:
                is_admin = await is_bot_admin_ctx(ctx)
            except Exception:
                pass

        grouped = await self._get_authorized_commands(ctx.author.id, ctx.guild,
                                                      ctx.channel, is_admin) # type: ignore
        ordered_categories = [
            "Moderation", "Voice", "Verification", "Roles", "Utility",
            "System", "General"
        ]

        # Build clean index dashboard statistics description
        total_visible = sum(len(cmds) for cmds in grouped.values())
        stats_desc = (
            f"⚡ **System Status:** Operational\n"
            f"📂 **Available Modules:** `{len(grouped)}`\n"
            f"📊 **Visible Commands:** `{total_visible}` (Filtered by Permissions)\n\n"
            f"Select a command module from the drop-down selection list below to view individual descriptions and structural execution choices syntax."
        )

        embed = make_embed(title="Digital Vigital • Help Center",
                           description=stats_desc,
                           level="INFO")
        if BANNER_GIF: embed.set_image(url=BANNER_GIF)
        embed.set_footer(text=f"Requested by: {ctx.author}",
                         icon_url=ctx.author.display_avatar.url)

        view = HelpDropdownView(ordered_categories, grouped, ctx.author.id)

        if ctx.interaction:
            await ctx.interaction.response.send_message(embed=embed,
                                                        view=view,
                                                        ephemeral=True)
            view.message = await ctx.interaction.original_response()
        else:
            try:
                await ctx.message.delete()
            except (discord.Forbidden, discord.NotFound,
                    discord.HTTPException):
                pass
            msg = await ctx.send(embed=embed, view=view)
            view.message = msg


async def setup(bot: commands.Bot):
    await bot.add_cog(Help(bot))
