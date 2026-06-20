from __future__ import annotations
import os
import json
import logging
import discord
from discord.ext import commands
from utils.core.embeds import make_embed
from utils.core.emojis import EMOJIS
from utils.permissions.check_perms import is_bot_admin_ctx
from db.db_helpers.channel_command_restrict import get_restricted_commands

logger = logging.getLogger("Digital Vigital")

BANNER_GIF = os.getenv("HELP_BANNER_GIF")
JSON_PATH = os.path.join("db", "static_db", "helps.json")

CATEGORY_EMOJIS = {
    "admin": EMOJIS.get("moderation", "🛡️"),
    "channels": EMOJIS.get("channels", "📁"),
    "moderation": EMOJIS.get("moderation", "🔨"),
    "prefix": EMOJIS.get("ping", "✨"),
    "vc_modules": "🔊",
    "hybrid_cmd": "📖",
    "general": EMOJIS.get("arrow_point", "🔹"),
}


class HelpDropdown(discord.ui.Select):
    def __init__(self, categories: list[dict], author_id: int, ctx_prefix: str):
        self.categories_map = {cat["id"]: cat for cat in categories}
        self.author_id = author_id
        self.ctx_prefix = ctx_prefix
        options = [
            discord.SelectOption(
                label=cat["name"],
                value=cat["id"],
                emoji=cat.get("emoji") or CATEGORY_EMOJIS.get(cat["id"], "🔹"),
                description=cat.get("description", f"Explore {cat['name']} set.")[:100],
            )
            for cat in categories
            if cat["commands"]
        ]
        super().__init__(
            placeholder="📂 Select a category to explore...",
            min_values=1,
            max_values=1,
            options=options,
        )

    async def callback(self, interaction: discord.Interaction):
        if interaction.user.id != self.author_id:
            return await interaction.response.send_message(
                "You cannot interact with this menu.", ephemeral=True
            )

        cat_id = self.values[0]
        category_data = self.categories_map[cat_id]
        emoji = category_data.get("emoji") or CATEGORY_EMOJIS.get(cat_id, "🔹")

        desc = f"### {emoji} {category_data['name']} Module\n"
        desc += "Browse the available commands below. Use `dv help <command>` for specific syntax.\n\n"

        arrow = EMOJIS.get("arrow_point", "🔹")
        for c in category_data["commands"]:
            # Logic: If it's a slash command, show /, otherwise show the hardcoded prefix
            prefix = "/" if c.get("is_slash") else self.ctx_prefix
            name = c["name"].replace("/", "")
            aliases = (
                f" *[Aliases: {', '.join(c['aliases'])}]*" if c.get("aliases") else ""
            )
            desc += f"{arrow} **`{prefix} {name}`**{aliases}\n> *{c.get('description', 'No description.')}*\n\n"

        embed = make_embed(
            title="Digital Vigital • Command Directory", description=desc, level="INFO"
        )
        if BANNER_GIF:
            embed.set_image(url=BANNER_GIF)
        await interaction.response.edit_message(embed=embed)


class HelpDropdownView(discord.ui.View):
    def __init__(self, categories: list[dict], author_id: int, ctx_prefix: str):
        super().__init__(timeout=60)
        self.message: discord.Message | discord.InteractionMessage | None = None
        self.add_item(HelpDropdown(categories, author_id, ctx_prefix))


class Help(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self._static_data: dict = {"categories": []}
        self.prefix = "dv"

    def load_static_help(self):
        if os.path.exists(JSON_PATH):
            with open(JSON_PATH, "r", encoding="utf-8") as f:
                self._static_data = json.load(f)

    async def _get_authorized_help_tree(self, guild, channel, is_admin):
        restricted = (
            set(await get_restricted_commands(guild.id, channel.id))
            if guild and channel
            else set()
        )
        filtered_categories = []
        for cat in self._static_data.get("categories", []):
            filtered_cmds = [
                c
                for c in cat.get("commands", [])
                if (c["name"].split()[0].lower() not in restricted or is_admin)
            ]
            if filtered_cmds:
                copy = cat.copy()
                copy["commands"] = filtered_cmds
                filtered_categories.append(copy)
        return filtered_categories

    @commands.hybrid_command(
        name="help", description="Show bot command directory.", aliases=["h"]
    )
    async def help(self, ctx: commands.Context, command_name: str = None): # type: ignore
        self.load_static_help()

        if command_name:
            for cat in self._static_data.get("categories", []):
                for cmd in cat.get("commands", []):
                    if command_name.lower() in [cmd["name"].lower()] + [
                        a.lower() for a in cmd.get("aliases", [])
                    ]:
                        prefix = "/" if cmd.get("is_slash") else self.prefix
                        usage = cmd.get("usage", "").replace("//", "/")
                        desc = (
                            f"### 📖 Command Detail: `{cmd['name']}`\n"
                            f"**Description:** {cmd.get('description')}\n"
                            f"**Usage:** `{prefix} {usage}`\n"
                            f"**Permissions:** `{cmd.get('permissions', 'None')}`"
                        )
                        return await ctx.send(
                            embed=make_embed(
                                title="Help Center", description=desc, level="INFO"
                            ),
                            ephemeral=True,
                        )
            return await ctx.send("Command not found.", ephemeral=True)

        tree = await self._get_authorized_help_tree(
            ctx.guild, ctx.channel, await is_bot_admin_ctx(ctx) if ctx.guild else False
        )

        desc = (
            f"### {EMOJIS.get('ping', '✨')} Welcome to the Help Center\n"
            "Select a module from the dropdown below to view category-specific actions.\n\n"
            f"• **Need specific info?** Use `{self.prefix} help <command_name>`\n"
            "• **System Status:** Operational"
        )

        embed = make_embed(
            title="Digital Vigital • Main Menu", description=desc, level="INFO"
        )
        if BANNER_GIF:
            embed.set_image(url=BANNER_GIF)

        view = HelpDropdownView(tree, ctx.author.id, self.prefix)
        view.message = await ctx.send(embed=embed, view=view)


async def setup(bot: commands.Bot):
    await bot.add_cog(Help(bot))
