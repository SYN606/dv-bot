import time
import discord
from discord.ext import commands

from utils.permissions.base_admin import BaseAdminCog
from utils.permissions.check_perms import is_bot_admin_ctx
from utils.core.embeds import make_embed
from utils.core.emojis import EMOJIS


# =====================================================
# VIEW
# =====================================================
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
                    description="You cannot use this button.",
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

    @discord.ui.button(
        label="More Stats",
        style=discord.ButtonStyle.secondary,
        emoji="📊",
    )
    async def more_stats(self, interaction: discord.Interaction, _):

        remaining = self._check_cd(interaction.user.id)
        if remaining > 0:
            await interaction.response.send_message(
                embed=make_embed(
                    title="Cooldown Active",
                    description=f"Try again in `{round(remaining,1)}s`",
                    level="WARNING",
                ),
                ephemeral=True,
            )
            return

        guild = self.guild

        humans = sum(1 for m in guild.members if not m.bot)
        bots = (guild.member_count or 0) - humans

        text_channels = len(guild.text_channels)
        voice_channels = len(guild.voice_channels)
        roles = len(guild.roles)

        embed = make_embed(
            title="Server Detailed Stats",
            description=
            (f"{EMOJIS['message']} Humans: `{humans}`\n"
             f"{EMOJIS['developer']} Bots: `{bots}`\n"
             f"{EMOJIS['folder']} Channels: `{text_channels + voice_channels}`\n"
             f"{EMOJIS['arrow_point']} Text: `{text_channels}` | Voice: `{voice_channels}`\n"
             f"{EMOJIS['moderation']} Roles: `{roles}`"),
            level="INFO",
        )

        await interaction.response.send_message(embed=embed, ephemeral=True)

    async def on_timeout(self):
        for item in self.children:
            item.disabled = True # type: ignore


# =====================================================
# COG
# =====================================================
class ServerInfo(BaseAdminCog):

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    # =====================================================
    # PERMISSIONS
    # =====================================================
    async def cog_check(self, ctx: commands.Context) -> bool:

        guild = ctx.guild
        if guild is None:
            return False

        if not isinstance(ctx.author, discord.Member):
            return False

        if ctx.author.id == guild.owner_id:
            return True

        if ctx.author.guild_permissions.administrator:
            return True

        return await is_bot_admin_ctx(ctx)

    # =====================================================
    # COMMAND
    # =====================================================
    @commands.command(
        name="server-info",
        aliases=["si"],
        help="View server information",
    )
    @commands.guild_only()
    @commands.cooldown(1, 10, commands.BucketType.user)
    @commands.max_concurrency(1, per=commands.BucketType.guild, wait=False)
    async def server_info(self, ctx: commands.Context):

        guild = ctx.guild
        if guild is None:
            return

        owner = guild.owner
        created = discord.utils.format_dt(guild.created_at, style="R")

        member_count = guild.member_count or 0
        boost_level = guild.premium_tier
        boosts = guild.premium_subscription_count or 0
        verification = str(guild.verification_level).title()

        embed = make_embed(
            title=guild.name,
            description=
            (f"{EMOJIS['announcement']} **Server Overview**\n\n"
             f"{EMOJIS['arrow_point']} Owner: {owner.mention if owner else 'Unknown'}\n"
             f"{EMOJIS['arrow_point']} Created: {created}\n"
             f"{EMOJIS['arrow_point']} Members: `{member_count}`\n"
             f"{EMOJIS['arrow_point']} Boost Level: `{boost_level}` ({boosts} boosts)\n"
             f"{EMOJIS['arrow_point']} Verification: `{verification}`"),
            level="SYSTEM",
            footer=f"Requested by {ctx.author}",
        )

        if guild.icon:
            embed.set_thumbnail(url=guild.icon.url)

        view = ServerInfoView(guild, ctx.author.id)

        await ctx.send(embed=embed, view=view)

    # =====================================================
    # ERROR HANDLER
    # =====================================================
    @server_info.error
    async def server_info_error(self, ctx, error):

        if isinstance(error, commands.CommandOnCooldown):
            await ctx.send(embed=make_embed(
                title="Cooldown Active",
                description=
                (f"{EMOJIS['warning']} Slow down.\n"
                 f"{EMOJIS['arrow_point']} Try again in `{round(error.retry_after,1)}s`"
                 ),
                level="WARNING",
            ))

        elif isinstance(error, commands.MaxConcurrencyReached):
            await ctx.send(embed=make_embed(
                title="Busy",
                description="This command is already running.",
                level="WARNING",
            ))


# =====================================================
# SETUP
# =====================================================
async def setup(bot: commands.Bot):
    await bot.add_cog(ServerInfo(bot))
