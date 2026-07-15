import discord
from discord import app_commands
from discord.ext import commands
from utils.permissions.base_admin import BaseAdminCog
from utils.core.embeds import make_embed
from utils.core.emojis import EMOJIS
from utils.logging.mod_log import send_mod_log


class FakeBanSystem(BaseAdminCog):

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    async def has_fake_ban_permission(self, ctx: commands.Context) -> bool:
        guild = ctx.guild
        if guild is None:
            return False

        author = ctx.author
        if not isinstance(author, discord.Member):
            return False

        if author.id == guild.owner_id:
            return True

        perms = author.guild_permissions
        if perms.administrator:
            return True

        return perms.ban_members or perms.manage_messages

    async def _reply(self,
                     ctx: commands.Context,
                     title: str,
                     description: str,
                     level: str = "ERROR",
                     show_footer: bool = False):
        embed = make_embed(title=title, description=description, level=level)

        if show_footer:
            embed.set_footer(text=f"Action by : {ctx.author}",
                             icon_url=ctx.author.display_avatar.url)

        try:
            if ctx.interaction:
                if ctx.interaction.response.is_done():
                    return await ctx.interaction.followup.send(embed=embed,
                                                               ephemeral=True)
                return await ctx.interaction.response.send_message(
                    embed=embed, ephemeral=True)

            try:
                return await ctx.reply(embed=embed, mention_author=False)
            except (discord.NotFound, discord.HTTPException):
                return await ctx.channel.send(embed=embed)
        except discord.HTTPException:
            return None

    async def _cleanup(self, ctx: commands.Context):
        try:
            if ctx.message:
                await ctx.message.delete()
        except (discord.Forbidden, discord.NotFound, discord.HTTPException):
            pass

    async def resolve_target(self, ctx: commands.Context, user_input):
        guild = ctx.guild
        if guild is None:
            return None

        if isinstance(user_input, discord.Member):
            return user_input

        if not user_input:
            if ctx.message and ctx.message.reference and isinstance(
                    ctx.message.reference.resolved, discord.Message):
                resolved_author = ctx.message.reference.resolved.author
                if isinstance(resolved_author, discord.Member):
                    return resolved_author
                return guild.get_member(resolved_author.id)

        if ctx.message and ctx.message.mentions:
            return ctx.message.mentions[0]

        try:
            user_id = int(user_input)
        except (TypeError, ValueError):
            return None

        member = guild.get_member(user_id)
        if member:
            return member

        try:
            return await self.bot.fetch_user(user_id)
        except (discord.NotFound, discord.Forbidden, discord.HTTPException):
            return None

    async def validate_fake_ban(self, ctx: commands.Context, target):
        guild = ctx.guild
        if guild is None:
            return False, "Invalid server configuration."

        moderator = ctx.author
        if not isinstance(moderator, discord.Member):
            return False, "Invalid moderator context."

        if not isinstance(target, discord.Member):
            return True, None

        if target.id == moderator.id:
            return False, "You cannot fake ban yourself."

        if target.id == guild.owner_id:
            return False, "You cannot fake ban the server owner."

        # Strict Security Rules: Normal users/lower staff cannot fake ban administrators
        if moderator != guild.owner and target.guild_permissions.administrator and not moderator.guild_permissions.administrator:
            return False, "You do not have permission to fake ban an administrator."

        if moderator != guild.owner and target.top_role >= moderator.top_role and not moderator.guild_permissions.administrator:
            return False, "You cannot fake ban someone with an equal or higher role."

        return True, None

    async def send_ban_dm(self, target: discord.Member | discord.User,
                          guild: discord.Guild, moderator: discord.Member,
                          reason: str):
        try:
            if reason != "No reason provided":
                description = (
                    f"{EMOJIS.get('ban', '🔨')} You were banned from **{guild.name}**\n\n"
                    f"{EMOJIS.get('arrow_point', '➡️')} **Moderator:** {moderator}\n"
                    f"{EMOJIS.get('arrow_point', '➡️')} **Reason:** {reason}")
            else:
                description = f"{EMOJIS.get('ban', '🔨')} You were banned from **{guild.name}**."

            embed = make_embed(title="You Were Banned",
                               description=description,
                               level="ERROR")
            await target.send(embed=embed)
        except (discord.Forbidden, discord.HTTPException):
            pass

    @commands.hybrid_command(
        name="fakeban",
        description=
        "Simulate a user ban completely (Sends DM and custom channel warnings)",
        aliases=['fban', 'fb']
    )
    @commands.guild_only()
    @app_commands.describe(user="The target member to fake ban",
                           reason="The mock reason for the ban logs")
    async def fakeban(self,
                      ctx: commands.Context,
                      user=None,
                      *,
                      reason: str | None = None):
        guild = ctx.guild
        if guild is None:
            return

        moderator = ctx.author
        if not isinstance(moderator, discord.Member):
            return

        if not await self.has_fake_ban_permission(ctx):
            return await self._reply(
                ctx, "Permission Denied",
                f"{EMOJIS.get('fail', '❌')} You do not have permission to use mock operations."
            )

        reason = reason or "No reason provided"

        target = await self.resolve_target(ctx, user)
        if not target:
            return await self._reply(
                ctx, "User Not Found",
                "Usage: `/fakeban <user | id | reply> [reason]`")

        valid, error = await self.validate_fake_ban(ctx, target)
        if not valid:
            return await self._reply(ctx, "Permission Denied", error
                                     or "Invalid target user.")

        await self.send_ban_dm(target=target,
                               guild=guild,
                               moderator=moderator,
                               reason=reason)

        await self._reply(
            ctx,
            "User Banned",
            f"{EMOJIS.get('ban', '🔨')} **{target}** has been banned.\n\n{EMOJIS.get('arrow_point', '➡️')} **Reason:** {reason}",
            level="ERROR",
            show_footer=True)

        await self._cleanup(ctx)

        try:
            await send_mod_log(
                guild=guild,
                category="BAN",
                title="User Banned (Simulation)",
                description=
                f"{target} was mock banned by administrative controls.",
                level="ERROR",
                actor=moderator,
                target=target,
                extra_fields={
                    "Reason": reason,
                    "Type": "Simulated Action"
                })
        except Exception:
            pass


async def setup(bot: commands.Bot):
    await bot.add_cog(FakeBanSystem(bot))
