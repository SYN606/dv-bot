import discord

from utils.core.embeds import make_embed
from utils.core.emojis import EMOJIS
from db.db_helpers.admin_roles import (
    add_admin_role,
    remove_admin_role,
    get_admin_roles,
)


# ─────────────────────────────────────
# MAIN ADMIN ROLE PANEL
# ─────────────────────────────────────
class AdminRoleView(discord.ui.View):
    def __init__(self, *, guild: discord.Guild, actor_id: int):
        super().__init__(timeout=180)

        self.guild = guild
        self.actor_id = actor_id
        self.message: discord.Message | None = None

    # ─────────────────────────
    # SECURITY
    # ─────────────────────────
    async def interaction_check(self, interaction: discord.Interaction) -> bool:

        if self.is_finished():
            await interaction.response.send_message(
                embed=make_embed(
                    title="Panel Expired",
                    description=f"{EMOJIS['warning']} Please run `/adminrole` again.",
                    level="WARNING",
                ),
                ephemeral=True,
            )
            return False

        if interaction.user.id != self.actor_id:
            await interaction.response.send_message(
                embed=make_embed(
                    title="Unauthorized",
                    description=f"{EMOJIS['fail']} You cannot use this panel.",
                    level="ERROR",
                ),
                ephemeral=True,
            )
            return False

        return True

    # ─────────────────────────
    # ADD ROLE
    # ─────────────────────────
    @discord.ui.button(
        label="Add Role",
        emoji=EMOJIS["green_dot"],
        style=discord.ButtonStyle.success,
    )
    async def add_role(self, interaction: discord.Interaction, _):

        await interaction.response.defer(ephemeral=True)

        view = AdminRoleSelectView(
            guild=self.guild,
            actor_id=self.actor_id,
            mode="add",
        )

        await interaction.followup.send(
            embed=make_embed(
                title="Add Bot Admin Role",
                description=(
                    f"{EMOJIS['rounded_loading']} Preparing role selector...\n\n"
                    f"{EMOJIS['arrow_point']} Select a role to add."
                ),
                level="INFO",
            ),
            view=view,
            ephemeral=True,
        )

    # ─────────────────────────
    # REMOVE ROLE
    # ─────────────────────────
    @discord.ui.button(
        label="Remove Role",
        emoji=EMOJIS["red_dot"],
        style=discord.ButtonStyle.danger,
    )
    async def remove_role(self, interaction: discord.Interaction, _):

        await interaction.response.defer(ephemeral=True)

        view = AdminRoleSelectView(
            guild=self.guild,
            actor_id=self.actor_id,
            mode="remove",
        )

        await interaction.followup.send(
            embed=make_embed(
                title="Remove Bot Admin Role",
                description=(
                    f"{EMOJIS['rounded_loading']} Preparing role selector...\n\n"
                    f"{EMOJIS['arrow_point']} Select a role to remove."
                ),
                level="INFO",
            ),
            view=view,
            ephemeral=True,
        )

    # ─────────────────────────
    # LIST ROLES
    # ─────────────────────────
    @discord.ui.button(
        label="List Roles",
        emoji=EMOJIS["folder"],
        style=discord.ButtonStyle.secondary,
    )
    async def list_roles(self, interaction: discord.Interaction, _):

        await interaction.response.defer(ephemeral=True)

        role_ids = await get_admin_roles(self.guild.id)

        roles = []

        for role_id in role_ids:
            role = self.guild.get_role(role_id)

            if role:
                roles.append(role.mention)

        description = (
            "\n".join(f"{EMOJIS['arrow_point']} {r}" for r in roles)
            if roles
            else f"{EMOJIS['warning']} No roles configured."
        )

        await interaction.followup.send(
            embed=make_embed(
                title="Configured Bot Admin Roles",
                description=description,
                level="INFO",
            ),
            ephemeral=True,
        )

    # ─────────────────────────
    # TIMEOUT
    # ─────────────────────────
    async def on_timeout(self):

        for item in self.children:
            item.disabled = True

        if not self.message:
            return

        try:
            await self.message.edit(
                embed=make_embed(
                    title="Panel Expired",
                    description=f"{EMOJIS['warning']} This panel has expired.",
                    level="WARNING",
                ),
                view=self,
            )
        except discord.HTTPException:
            pass


# ─────────────────────────────────────
# ROLE SELECT VIEW
# ─────────────────────────────────────
class AdminRoleSelectView(discord.ui.View):
    def __init__(self, *, guild: discord.Guild, actor_id: int, mode: str):
        super().__init__(timeout=60)

        self.guild = guild
        self.actor_id = actor_id
        self.mode = mode

        self.add_item(AdminRoleSelect(self))

    async def interaction_check(self, interaction: discord.Interaction) -> bool:

        if interaction.user.id != self.actor_id:
            await interaction.response.send_message(
                embed=make_embed(
                    title="Unauthorized",
                    description=f"{EMOJIS['fail']} You cannot use this selection.",
                    level="ERROR",
                ),
                ephemeral=True,
            )
            return False

        return True


# ─────────────────────────────────────
# ROLE SELECT COMPONENT
# ─────────────────────────────────────
class AdminRoleSelect(discord.ui.RoleSelect):
    def __init__(self, view: AdminRoleSelectView):
        super().__init__(
            placeholder="Select a role",
            min_values=1,
            max_values=1,
        )

        self.view_ref = view

    async def callback(self, interaction: discord.Interaction):

        role = self.values[0]
        guild = self.view_ref.guild
        bot_member = guild.me
        actor = interaction.user

        # ─────────────────────────
        # ROLE VALIDATION
        # ─────────────────────────
        if role.is_default():
            return await interaction.response.edit_message(
                embed=make_embed(
                    title="Invalid Role",
                    description=f"{EMOJIS['fail']} You cannot use **@everyone**.",
                    level="ERROR",
                ),
                view=None,
            )

        if role.managed:
            return await interaction.response.edit_message(
                embed=make_embed(
                    title="Invalid Role",
                    description=f"{EMOJIS['fail']} Managed roles cannot be used.",
                    level="ERROR",
                ),
                view=None,
            )

        if bot_member and role >= bot_member.top_role:
            return await interaction.response.edit_message(
                embed=make_embed(
                    title="Hierarchy Error",
                    description=f"{EMOJIS['fail']} My role is not high enough to manage this role.",
                    level="ERROR",
                ),
                view=None,
            )

        if isinstance(actor, discord.Member) and role >= actor.top_role:
            return await interaction.response.edit_message(
                embed=make_embed(
                    title="Hierarchy Error",
                    description=f"{EMOJIS['fail']} You cannot configure roles higher than your own.",
                    level="ERROR",
                ),
                view=None,
            )

        # ─────────────────────────
        # DATABASE ACTION
        # ─────────────────────────
        if self.view_ref.mode == "add":
            added = await add_admin_role(guild.id, role.id)

            msg = (
                f"{EMOJIS['success']} {role.mention} added."
                if added
                else f"{EMOJIS['warning']} Already configured."
            )

            level = "SUCCESS" if added else "WARNING"

        else:
            removed = await remove_admin_role(guild.id, role.id)

            msg = (
                f"{EMOJIS['success']} {role.mention} removed."
                if removed
                else f"{EMOJIS['warning']} Not configured."
            )

            level = "SUCCESS" if removed else "WARNING"

        await interaction.response.edit_message(
            embed=make_embed(
                title="Bot Admin Roles Updated",
                description=msg,
                level=level,
            ),
            view=None,
        )
