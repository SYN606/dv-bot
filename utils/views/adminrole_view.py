import discord

from utils.embeds import make_embed
from utils.emojis import EMOJIS
from utils.check_perms import is_bot_admin
from db.db_helpers.admin_roles import (
    add_admin_role,
    remove_admin_role,
    get_admin_roles,
)


class AdminRoleView(discord.ui.View):
    """
    v2 Admin Role Control Panel

    - Single ephemeral message
    - Button-driven actions
    - Clean UX
    """

    def __init__(
        self,
        *,
        guild: discord.Guild,
        actor_id: int,
    ):
        super().__init__(timeout=180)

        self.guild = guild
        self.actor_id = actor_id

    # ─────────────────────────
    # Interaction guard
    # ─────────────────────────
    async def interaction_check(self,
                                interaction: discord.Interaction) -> bool:
        return interaction.user.id == self.actor_id and is_bot_admin(
            interaction)

    # ─────────────────────────
    # ADD ROLE
    # ─────────────────────────
    @discord.ui.button(
        label="Add Role",
        emoji=EMOJIS["green_dot"],
        style=discord.ButtonStyle.success,
    )
    async def add_role(
        self,
        interaction: discord.Interaction,
        _: discord.ui.Button,
    ):
        await interaction.response.send_message(
            embed=make_embed(
                title="Add Bot Admin Role",
                description=
                f"{EMOJIS['arrow_point']} Select a role to add as bot admin.",
                level="INFO",
            ),
            view=AdminRoleSelectView(
                guild=self.guild,
                mode="add",
                parent=self,
            ),
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
    async def remove_role(
        self,
        interaction: discord.Interaction,
        _: discord.ui.Button,
    ):
        await interaction.response.send_message(
            embed=make_embed(
                title="Remove Bot Admin Role",
                description=f"{EMOJIS['arrow_point']} Select a role to remove.",
                level="INFO",
            ),
            view=AdminRoleSelectView(
                guild=self.guild,
                mode="remove",
                parent=self,
            ),
            ephemeral=True,
        )

    # ─────────────────────────
    # LIST ROLES
    # ─────────────────────────
    @discord.ui.button(
        label="List Roles",
        emoji=EMOJIS["pants"],
        style=discord.ButtonStyle.secondary,
    )
    async def list_roles(
        self,
        interaction: discord.Interaction,
        _: discord.ui.Button,
    ):
        role_ids = get_admin_roles(self.guild.id)

        roles: list[str] = []
        for role_id in role_ids:
            role = self.guild.get_role(role_id)
            if role:
                roles.append(role.mention)

        await interaction.response.edit_message(
            embed=make_embed(
                title="Configured Bot Admin Roles",
                description=(
                    "\n".join(roles) if roles else
                    f"{EMOJIS['warning']} No bot admin roles configured."),
                level="INFO",
            ),
            view=self,
        )

    # ─────────────────────────
    # TIMEOUT
    # ─────────────────────────
    async def on_timeout(self):
        for item in self.children:
            item.disabled = True  # type: ignore

        try:
            await self.message.edit(
                embed=make_embed(
                    title="Admin Role Panel Expired",
                    description=f"{EMOJIS['warning']} This panel has expired.",
                    level="WARNING",
                ),
                view=self,
            )
        except Exception:
            pass


# ─────────────────────────────────────
# ROLE SELECT VIEW
# ─────────────────────────────────────
class AdminRoleSelectView(discord.ui.View):

    def __init__(
        self,
        *,
        guild: discord.Guild,
        mode: str,  # "add" | "remove"
        parent: AdminRoleView,
    ):
        super().__init__(timeout=60)

        self.guild = guild
        self.mode = mode
        self.parent = parent

        self.add_item(AdminRoleSelect(self))


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

        if self.view_ref.mode == "add":
            added = add_admin_role(self.view_ref.guild.id, role.id)
            msg = (
                f"{EMOJIS['success']} {role.mention} added as bot admin role."
                if added else
                f"{EMOJIS['warning']} {role.mention} is already a bot admin role."
            )
            level = "SUCCESS" if added else "WARNING"

        else:
            removed = remove_admin_role(self.view_ref.guild.id, role.id)
            msg = (
                f"{EMOJIS['success']} {role.mention} removed from bot admin roles."
                if removed else
                f"{EMOJIS['warning']} {role.mention} was not a bot admin role."
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
