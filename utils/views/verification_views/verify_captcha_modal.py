import secrets
import string
import discord

from utils.embeds import make_embed
from utils.emojis import EMOJIS
from utils.handlers.verify_handler import handle_verification


def generate_token(length: int = 6) -> str:
    chars = string.ascii_lowercase + string.digits
    return "".join(secrets.choice(chars) for _ in range(length))


class VerifyCaptchaModal(discord.ui.Modal):

    def __init__(self, guild_id: int):
        self.guild_id = guild_id
        self.token = generate_token()
        self._used = False  # simple replay guard

        super().__init__(
            title="Verification Check",
            timeout=120,
        )

        self.captcha_display = discord.ui.TextInput(
            label="Verification Code",
            default=self.token,
            required=False,
        )
        self.captcha_display.disabled = True

        self.code_input = discord.ui.TextInput(
            label="Enter the code shown above",
            placeholder="type the code exactly",
            required=True,
            max_length=len(self.token),
        )

        self.add_item(self.captcha_display)
        self.add_item(self.code_input)

    async def on_submit(self, interaction: discord.Interaction) -> None:

        if self._used:
            return

        self._used = True

        try:
            await interaction.response.defer(ephemeral=True)
        except discord.NotFound:
            return

        try:
            guild = interaction.client.get_guild(self.guild_id)
            if guild is None:
                return await interaction.followup.send(
                    embed=make_embed(
                        title="Verification Error",
                        description="Server not found.",
                        level="ERROR",
                    ),
                    ephemeral=True,
                )

            member = guild.get_member(interaction.user.id)
            if member is None:
                return await interaction.followup.send(
                    embed=make_embed(
                        title="Verification Error",
                        description="We couldn’t verify your membership.",
                        level="ERROR",
                    ),
                    ephemeral=True,
                )

            # Check already verified (prevent spam)
            if any(role.name.lower() == "verified" for role in member.roles):
                return await interaction.followup.send(
                    embed=make_embed(
                        title="Already Verified",
                        description="You are already verified.",
                        level="INFO",
                    ),
                    ephemeral=True,
                )

            # Validate captcha
            if self.code_input.value.strip().lower() != self.token:
                return await interaction.followup.send(
                    embed=make_embed(
                        title="Verification Failed",
                        description="Incorrect code. Please try again.",
                        level="ERROR",
                    ),
                    ephemeral=True,
                )

            # Apply verification
            success = await handle_verification(
                guild=guild,
                member=member,
            )

            if success:
                return await interaction.followup.send(
                    embed=make_embed(
                        title="Verification Complete",
                        description=
                        f"You are now verified in **{guild.name}**.",
                        level="SUCCESS",
                    ),
                    ephemeral=True,
                )

            return await interaction.followup.send(
                embed=make_embed(
                    title="Verification Error",
                    description="Could not complete verification.",
                    level="ERROR",
                ),
                ephemeral=True,
            )

        except Exception:
            try:
                await interaction.followup.send(
                    embed=make_embed(
                        title="Verification Error",
                        description="An unexpected error occurred.",
                        level="ERROR",
                    ),
                    ephemeral=True,
                )
            except Exception:
                pass

    async def on_timeout(self) -> None:
        self._used = True
