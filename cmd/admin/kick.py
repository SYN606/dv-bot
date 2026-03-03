import discord
from discord.ext import commands

from utils.base_admin import BaseAdminCog
from utils.embeds import make_embed
from utils.logging.mod_log import send_mod_log


class KickSystem(BaseAdminCog):
    """
    PREFIX:
    dv kick <member | reply> [reason]
    """

    def __init__(self, bot: commands.Bot):
        self.bot = bot

    # =========================================================
    # FAST Reply Resolution (No API Call)
    # =========================================================

    def _resolve_from_reply(self,
                            ctx: commands.Context) -> discord.Member | None:
        ref = ctx.message.reference
        if not ref:
            return None

        # Uses cached resolved message (no HTTP call)
        if isinstance(ref.resolved, discord.Message):
            return ctx.guild.get_member(ref.resolved.author.id)

        return None

    # =========================================================
    # Target Validation
    # =========================================================

    async def _validate_target(
        self,
        ctx: commands.Context,
        member: discord.Member,
    ) -> str | None:

        guild = ctx.guild
        moderator: discord.Member = ctx.author
        bot_member = guild.me

        # Self protection
        if member == moderator:
            return "You cannot kick yourself."

        # Owner protection
        if member == guild.owner:
            return "You cannot kick the server owner."

        # Bot protection
        if member == guild.me:
            return "You cannot kick me."

        # Bot permission check
        if not bot_member.guild_permissions.kick_members:
            return "I do not have permission to kick members."

        # Admin + hierarchy checks
        if moderator != guild.owner:

            if member.guild_permissions.administrator:
                return "You cannot kick another administrator."

            if member.top_role >= moderator.top_role:
                return "You cannot kick someone with equal or higher role."

        # Bot hierarchy check
        if bot_member.top_role <= member.top_role:
            return "I cannot manage this member due to role hierarchy."

        return None

    # =========================================================
    # DM User (Silent Fail Safe)
    # =========================================================

    async def _notify_user(
        self,
        member: discord.Member,
        guild_name: str,
        reason: str,
    ) -> None:
        try:
            await member.send(embed=make_embed(
                title="You Have Been Kicked",
                description=(f"Server: {guild_name}\n"
                             f"Reason: {reason}"),
                level="ERROR",
            ))
        except discord.Forbidden:
            pass  # User DMs closed — ignore silently

    # =========================================================
    # KICK COMMAND
    # =========================================================

    @commands.command(name="kick")
    @commands.guild_only()
    async def kick(
        self,
        ctx: commands.Context,
        member: discord.Member = None,
        *,
        reason: str | None = None,
    ):

        # Resolve from reply if member not directly provided
        if not member:
            member = self._resolve_from_reply(ctx)

        if not member:
            return await ctx.reply(
                embed=make_embed(
                    title="Missing User",
                    description="Usage: dv kick <user | reply> [reason]",
                    level="ERROR",
                ),
                mention_author=False,
            )

        reason = reason or "No reason provided"

        # Validate target
        error = await self._validate_target(ctx, member)
        if error:
            return await ctx.reply(
                embed=make_embed(
                    title="Permission Denied",
                    description=error,
                    level="ERROR",
                ),
                mention_author=False,
            )

        # Attempt DM before kick
        await self._notify_user(member, ctx.guild.name, reason)

        # Execute kick
        await member.kick(reason=f"{reason} | Kicked by {ctx.author}")

        # Immediate confirmation (no auto-delete)
        await ctx.reply(
            embed=make_embed(
                title="User Kicked",
                description=(f"{member.mention}\n"
                             f"Reason: {reason}"),
                level="WARNING",
            ),
            mention_author=False,
        )

        # Structured moderation log
        await send_mod_log(
            guild=ctx.guild,
            category="BAN",
            title="User Kicked",
            description=f"{member} was kicked.",
            level="WARNING",
            actor=ctx.author,
            target=member,
            extra_fields={
                "Reason": reason,
            },
        )


async def setup(bot: commands.Bot):
    await bot.add_cog(KickSystem(bot))
