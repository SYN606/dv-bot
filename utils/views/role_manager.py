import discord
from discord.ui import View, Button, RoleSelect, Select

from utils.embeds import make_embed
from utils.emojis import EMOJIS
from utils.check_perms import is_bot_admin


# region: ADD ROLE SELECT
class AddRoleSelect(RoleSelect):

    def __init__(self, manager: "RoleManagerView"):
        super().__init__(
            placeholder="Select roles to add",
            min_values=1,
            max_values=10,
        )
        self.manager = manager

    async def callback(self, interaction: discord.Interaction):

        if not self.manager.is_authorized(interaction):
            await self.manager.safe_respond(
                interaction,
                f"{EMOJIS['warning']} You are not authorized to use this menu.",
                ephemeral=True,
            )
            return

        for role in self.values:
            self.manager.to_add.add(role.id)
            self.manager.to_remove.discard(role.id)

        await self.manager.update_embed(
            interaction,
            notice=
            f"{EMOJIS['green_dot']} {len(self.values)} role(s) queued for addition",
        )


# region: REMOVE ROLE SELECT
class RemoveRoleSelect(Select):

    def __init__(self, manager: "RoleManagerView"):
        self.manager = manager
        bot_member = manager.guild.me

        options: list[discord.SelectOption] = []

        if bot_member:
            for role in manager.target.roles:
                if role.is_default():
                    continue
                if role >= bot_member.top_role:
                    continue

                options.append(
                    discord.SelectOption(
                        label=role.name,
                        value=str(role.id),
                    ))

        super().__init__(
            placeholder="Select roles to remove",
            min_values=1,
            max_values=min(10, len(options)) if options else 1,
            options=options,
            disabled=not options,
        )

    async def callback(self, interaction: discord.Interaction):

        if not self.manager.is_authorized(interaction):
            await self.manager.safe_respond(
                interaction,
                f"{EMOJIS['warning']} You are not authorized to use this menu.",
                ephemeral=True,
            )
            return

        for value in self.values:
            role_id = int(value)
            self.manager.to_remove.add(role_id)
            self.manager.to_add.discard(role_id)

        await self.manager.update_embed(
            interaction,
            notice=
            f"{EMOJIS['red_dot']} {len(self.values)} role(s) queued for removal",
        )


# region: ROLE MANAGER VIEW
class RoleManagerView(View):

    def __init__(
        self,
        bot: discord.Client,
        actor: discord.Member,
        target: discord.Member,
        guild: discord.Guild,
    ):
        super().__init__(timeout=300)

        self.bot = bot
        self.actor = actor
        self.target = target
        self.guild = guild

        self.to_add: set[int] = set()
        self.to_remove: set[int] = set()
        self.notice: str | None = None
        self.message: discord.Message | None = None

        self.add_item(AddRoleSelect(self))
        self.add_item(RemoveRoleSelect(self))

    # ─────────────────────────────
    # SAFE RESPONSE HANDLER
    # ─────────────────────────────
    async def safe_respond(
        self,
        interaction: discord.Interaction,
        content=None,
        embed=None,
        ephemeral=False,
    ):
        if interaction.response.is_done():
            await interaction.followup.send(
                content=content,
                embed=embed,
                ephemeral=ephemeral,
            )
        else:
            await interaction.response.send_message(
                content=content,
                embed=embed,
                ephemeral=ephemeral,
            )

    # region: AUTH CHECK
    def is_authorized(self, interaction: discord.Interaction) -> bool:

        if interaction.user != self.actor:
            return False

        if not is_bot_admin(interaction):
            return False

        # Prevent managing users above actor
        if self.target.top_role >= self.actor.top_role:
            return False

        return True

    # region: EMBED UPDATE
    async def update_embed(
        self,
        interaction: discord.Interaction,
        notice: str | None = None,
    ):
        if notice:
            self.notice = notice

        embed = make_embed(
            title="Role Manager",
            description=
            (f"{EMOJIS['moderation']} **Target:** {self.target.mention}\n\n"
             f"{EMOJIS['green_dot']} To add: **{len(self.to_add) or 'None'}**\n"
             f"{EMOJIS['red_dot']} To remove: **{len(self.to_remove) or 'None'}**"
             ),
            level="SYSTEM",
            footer=self.notice or "Use the menus to queue role changes",
        )

        if interaction.response.is_done():
            await interaction.edit_original_response(embed=embed, view=self)
        else:
            await interaction.response.edit_message(embed=embed, view=self)

    # region: APPLY CHANGES BUTTON
    @discord.ui.button(
        label="Apply Changes",
        style=discord.ButtonStyle.primary,
        emoji="✅",
    )
    async def done(self, interaction: discord.Interaction, _: Button):

        if not self.is_authorized(interaction):
            await self.safe_respond(
                interaction,
                f"{EMOJIS['warning']} You are not authorized to complete this action.",
                ephemeral=True,
            )
            return

        await interaction.response.defer()

        bot_member = self.guild.me
        if bot_member is None:
            return

        added: list[str] = []
        removed: list[str] = []
        skipped: list[str] = []

        # region: ADD ROLES
        for role_id in self.to_add:
            role = self.guild.get_role(role_id)

            if (not role or role >= bot_member.top_role
                    or role >= self.actor.top_role):
                skipped.append(role.name if role else "Unknown role")
                continue

            try:
                await self.target.add_roles(
                    role,
                    reason=f"Role manager by {self.actor}",
                )
                added.append(role.name)
            except discord.HTTPException:
                skipped.append(role.name)

        # region: REMOVE ROLES
        for role_id in self.to_remove:
            role = self.guild.get_role(role_id)

            if (not role or role >= bot_member.top_role
                    or role >= self.actor.top_role):
                skipped.append(role.name if role else "Unknown role")
                continue

            try:
                await self.target.remove_roles(
                    role,
                    reason=f"Role manager by {self.actor}",
                )
                removed.append(role.name)
            except discord.HTTPException:
                skipped.append(role.name)

        for item in self.children:
            item.disabled = True  # type: ignore

        embed = make_embed(
            title="Roles Updated",
            description=(
                f"{EMOJIS['moderation']} **Target:** {self.target.mention}\n\n"
                f"{EMOJIS['green_dot']} Added: {', '.join(added) or 'None'}\n"
                f"{EMOJIS['red_dot']} Removed: {', '.join(removed) or 'None'}\n"
                f"{EMOJIS['warning']} Skipped: {', '.join(skipped) or 'None'}"
            ),
            level="SUCCESS",
            footer=f"Action by {interaction.user}",
        )

        await interaction.edit_original_response(
            embed=embed,
            view=self,
        )

        self.stop()

    # region: TIMEOUT
    async def on_timeout(self):

        for item in self.children:
            item.disabled = True  # type: ignore

        try:
            if self.message:
                await self.message.edit(
                    content=f"{EMOJIS['warning']} Role manager timed out.",
                    view=self,
                )
        except Exception:
            pass
