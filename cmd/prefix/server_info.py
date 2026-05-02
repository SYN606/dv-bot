import time
import discord
from discord.ext import commands

from utils.permissions.base_admin import BaseAdminCog
from utils.permissions.check_perms import is_bot_admin_ctx
from utils.core.embeds import make_embed
from utils.core.emojis import EMOJIS


class ServerInfoView(discord.ui.View):

    def __init__(self, guild: discord.Guild, author_id: int):
        super().__init__(timeout=30)
        self.guild = guild
        self.author_id = author_id
        self._cooldowns: dict[int, float] = {}
        self.COOLDOWN = 5

    async def interaction_check(self,
                                interaction: discord.Interaction) -> bool:
        if interaction.user.id != self.author_id:
            await interaction.response.send_message(
                embed=make_embed(
                    title="Access Denied",
                    description=f"{EMOJIS['fail']} You cannot use this.",
                    level="ERROR",
                ),
                ephemeral=True,
            )
            return False
        return True

    def _check_cd(self, user_id: int) -> float:
        now = time.time()
        last = self._cooldowns.get(user_id, 0)
        remaining = self.COOLDOWN - (now - last)

        if remaining > 0:
            return remaining

        self._cooldowns[user_id] = now
        return 0

    @discord.ui.button(label="More",
                       emoji="📊",
                       style=discord.ButtonStyle.secondary)
    async def more_stats(self, interaction: discord.Interaction, _):

        remaining = self._check_cd(interaction.user.id)
        if remaining > 0:
            await interaction.response.send_message(
                embed=make_embed(
                    title="Cooldown",
                    description=f"{EMOJIS['warning']} Wait `{remaining:.1f}s`",
                    level="WARNING",
                ),
                ephemeral=True,
            )
            return

        g = self.guild

        humans = sum(1 for m in g.members if not m.bot)
        bots = (g.member_count or 0) - humans

        online = sum(1 for m in g.members
                     if m.status in (discord.Status.online,
                                     discord.Status.idle, discord.Status.dnd))

        text = len(g.text_channels)
        voice = len(g.voice_channels)

        embed = make_embed(
            title="📊 Server Stats",
            description=
            (f"{EMOJIS['green_dot']} Members: `{g.member_count}`\n"
             f"{EMOJIS['developer']} Humans: `{humans}` | Bots: `{bots}`\n"
             f"{EMOJIS['ping']} Active: `{online}`\n"
             f"{EMOJIS['folder']} Channels: `{text + voice}` (T `{text}` | V `{voice}`)\n"
             f"{EMOJIS['moderation']} Roles: `{len(g.roles)}`"),
            level="INFO",
        )

        await interaction.response.send_message(embed=embed, ephemeral=True)

    async def on_timeout(self):
        for item in self.children:
            item.disabled = True  # type: ignore


class ServerInfo(BaseAdminCog):

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    async def cog_check(self, ctx: commands.Context) -> bool:

        g = ctx.guild
        if g is None:
            return False

        if not isinstance(ctx.author, discord.Member):
            return False

        if ctx.author.id == g.owner_id:
            return True

        if ctx.author.guild_permissions.administrator:
            return True

        return await is_bot_admin_ctx(ctx)

    @commands.command(
        name="server-info",
        aliases=["si"],
        help="View server information",
    )
    @commands.guild_only()
    @commands.cooldown(1, 8, commands.BucketType.user)
    @commands.max_concurrency(1, per=commands.BucketType.guild, wait=False)
    async def server_info(self, ctx: commands.Context):

        g = ctx.guild
        if g is None:
            return

        owner = g.owner
        created = discord.utils.format_dt(g.created_at, style="R")

        humans = sum(1 for m in g.members if not m.bot)
        bots = (g.member_count or 0) - humans

        online = sum(1 for m in g.members
                     if m.status in (discord.Status.online,
                                     discord.Status.idle, discord.Status.dnd))

        embed = make_embed(
            title=f"{EMOJIS['announcement']} {g.name}",
            description=
            (f"{EMOJIS['arrow_point']} Owner: {owner.mention if owner else 'Unknown'}\n"
             f"{EMOJIS['arrow_point']} Created: {created}\n\n"
             f"{EMOJIS['green_dot']} Members: `{g.member_count}`\n"
             f"{EMOJIS['developer']} Humans: `{humans}` | Bots: `{bots}`\n"
             f"{EMOJIS['ping']} Active: `{online}`\n\n"
             f"{EMOJIS['boost']} Boosts: `{g.premium_subscription_count or 0}` (Level {g.premium_tier})\n"
             f"{EMOJIS['okay']} Verification: `{str(g.verification_level).title()}`"
             ),
            level="SYSTEM",
        )

        if g.icon:
            embed.set_thumbnail(url=g.icon.url)

        view = ServerInfoView(g, ctx.author.id)

        await ctx.send(embed=embed, view=view)

    @server_info.error
    async def server_info_error(self, ctx, error):

        if isinstance(error, commands.CommandOnCooldown):
            await ctx.send(embed=make_embed(
                title="Cooldown",
                description=
                f"{EMOJIS['warning']} Try again in `{round(error.retry_after,1)}s`",
                level="WARNING",
            ))

        elif isinstance(error, commands.MaxConcurrencyReached):
            await ctx.send(embed=make_embed(
                title="Busy",
                description=f"{EMOJIS['loading']} Already running.",
                level="WARNING",
            ))


async def setup(bot: commands.Bot):
    await bot.add_cog(ServerInfo(bot))
