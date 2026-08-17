import asyncio
import logging
import secrets
import string
import discord

from db.models import VerificationConfig, TempbanRecord
from utils.core.embeds import make_embed

logger = logging.getLogger("bot")
_verify_locks: dict[int, asyncio.Lock] = {}


def get_verify_lock(guild_id: int) -> asyncio.Lock:
    if guild_id not in _verify_locks:
        _verify_locks[guild_id] = asyncio.Lock()
    return _verify_locks[guild_id]


def generate_token(length: int = 6) -> str:
    # Keeps it strictly to lowercase alphanumeric characters
    chars = string.ascii_lowercase + string.digits
    return "".join(secrets.choice(chars) for _ in range(length))


class VerifyCaptchaModal(discord.ui.Modal):

    def __init__(self, guild_id: int):
        self.guild_id = guild_id
        # Force the generated token string to lower case explicitly
        self.token = generate_token().lower()
        self._used = False

        super().__init__(title="Verification Check", timeout=120)

        # Define the display input cleanly.
        self.captcha_display = discord.ui.TextInput(
            label="Verification Code (Type exactly as shown)",
            default=self.token,
            required=False,
            style=discord.TextStyle.short,
        )

        self.code_input = discord.ui.TextInput(
            label="Enter the code shown above",
            placeholder="Type the lowercase/number code here",
            required=True,
            max_length=len(self.token),
            style=discord.TextStyle.short,
        )

        self.add_item(self.captcha_display)
        self.add_item(self.code_input)

    async def on_submit(self, interaction: discord.Interaction) -> None:
        if self._used:
            return
        self._used = True

        guild = interaction.guild
        user = interaction.user
        if guild is None or not isinstance(user, discord.Member):
            return

        lock = get_verify_lock(guild.id)
        async with lock:
            await asyncio.sleep(0.15)
            try:
                if not interaction.response.is_done():
                    await interaction.response.defer(ephemeral=True)
            except discord.HTTPException:
                return

            # SECURITY CHECK: Block Tempbanned Accounts via Tortoise ORM
            try:
                is_tempbanned = await TempbanRecord.filter(
                    guild_id=guild.id,
                    user_id=user.id,
                    active=True,
                ).exists()
            except Exception as e:
                logger.error(
                    f"Database error during verification ban check: {e}")
                is_tempbanned = False

            if is_tempbanned:
                await interaction.followup.send(
                    embed=make_embed(
                        title="Verification Blocked",
                        description=
                        ("You are currently temporarily banned from this server and cannot verify."
                         ),
                        level="ERROR",
                    ),
                    ephemeral=True,
                )
                return

            # Captcha Verification Logic
            user_input = self.code_input.value.strip().lower()
            if user_input != self.token:
                await interaction.followup.send(
                    embed=make_embed(
                        title="Verification Failed",
                        description=
                        f"Incorrect code (`{user_input}`). Please try again.",
                        level="ERROR",
                    ),
                    ephemeral=True,
                )
                return

            # Fetch Config via Tortoise ORM
            try:
                config = await VerificationConfig.filter(guild_id=guild.id
                                                         ).first()
            except Exception as e:
                logger.error(
                    f"Database error during verification config fetch: {e}")
                config = None

            if not config or not config.verified_role_id:
                await interaction.followup.send(
                    embed=make_embed(
                        title="Verification Error",
                        description=
                        "Verification system is not configured fully.",
                        level="ERROR",
                    ),
                    ephemeral=True,
                )
                return

            verified_role_id: int = config.verified_role_id
            unverified_role_id: int | None = config.unverified_role_id

            verified_role = guild.get_role(verified_role_id)
            unverified_role = (guild.get_role(unverified_role_id)
                               if unverified_role_id else None)

            if not verified_role:
                await interaction.followup.send(
                    embed=make_embed(
                        title="Verification Error",
                        description="Verified role no longer exists.",
                        level="ERROR",
                    ),
                    ephemeral=True,
                )
                return

            if verified_role in user.roles:
                await interaction.followup.send(
                    embed=make_embed(
                        title="Already Verified",
                        description="You are already verified.",
                        level="INFO",
                    ),
                    ephemeral=True,
                )
                return

            bot_member = guild.me
            if not bot_member or verified_role >= bot_member.top_role:
                await interaction.followup.send(
                    embed=make_embed(
                        title="Verification Error",
                        description=
                        ("Bot cannot assign the verified role because it is above its role hierarchy."
                         ),
                        level="ERROR",
                    ),
                    ephemeral=True,
                )
                return

            try:
                if unverified_role and unverified_role in user.roles:
                    await user.remove_roles(unverified_role,
                                            reason="User verified")
                await user.add_roles(
                    verified_role,
                    reason="User completed captcha verification",
                )
            except discord.HTTPException as e:
                logger.error(
                    f"Failed to apply/remove roles for verification: {e}")
                await interaction.followup.send(
                    embed=make_embed(
                        title="Verification Error",
                        description=
                        ("Failed to assign roles. Check if the bot has proper permissions."
                         ),
                        level="ERROR",
                    ),
                    ephemeral=True,
                )
                return

            await interaction.followup.send(
                embed=make_embed(
                    title="Verification Complete",
                    description=f"You are now verified in **{guild.name}**.",
                    level="SUCCESS",
                ),
                ephemeral=True,
            )

            if config.log_channel_id:
                log_channel = guild.get_channel(config.log_channel_id)
                if isinstance(log_channel, discord.TextChannel):
                    try:
                        await asyncio.sleep(0.25)

                        # Safely type check channel to satisfy Pylance
                        ch = interaction.channel
                        if isinstance(
                                ch,
                            (
                                discord.TextChannel,
                                discord.Thread,
                                discord.ForumChannel,
                                discord.VoiceChannel,
                            ),
                        ):
                            channel_str = ch.mention
                        else:
                            channel_str = "Unknown"

                        await log_channel.send(embed=make_embed(
                            title="✅ User Verified",
                            description=
                            (f"👤 User: {user.mention}\n"
                             f"🆔 ID: `{user.id}`\n"
                             f"📥 Role Added: {verified_role.mention}\n"
                             f"📤 Role Removed: {unverified_role.mention if unverified_role else 'None'}\n"
                             f"📍 Channel: {channel_str}"),
                            level="SUCCESS",
                            footer=f"Guild: {guild.name}",
                        ))
                    except discord.HTTPException:
                        pass

    async def on_timeout(self) -> None:
        self._used = True
