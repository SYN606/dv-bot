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

    def __init__(self, *, guild: discord.Guild, actor_id: int):
        super().__init__(timeout=180)

        self.guild = guild
        self.actor_id = actor_id
        self.message: discord.Message | None = None

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
    async def add_role(self, interaction: discord.Interaction, _):
        await interaction.response.send_message(
            embed=make_embed(
                title="Add Bot Admin Role",
                description=f"{EMOJIS['arrow_point']} Select a role to add.",
                level="INFO",
            ),
            view=AdminRoleSelectView(
                guild=self.guild,
                mode="add",
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
    async def remove_role(self, interaction: discord.Interaction, _):
        await interaction.response.send_message(
            embed=make_embed(
                title="Remove Bot Admin Role",
                description=f"{EMOJIS['arrow_point']} Select a role to remove.",
                level="INFO",
            ),
            view=AdminRoleSelectView(
                guild=self.guild,
                mode="remove",
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
    async def list_roles(self, interaction: discord.Interaction, _):

        await interaction.response.defer()

        role_ids = await get_admin_roles(self.guild.id)

        roles = [
            self.guild.get_role(role_id).mention for role_id in role_ids
            if self.guild.get_role(role_id)
        ]

        await interaction.edit_original_response(
            embed=make_embed(
                title="Configured Bot Admin Roles",
                description=("\n".join(roles) if roles else
                             f"{EMOJIS['warning']} No roles configured."),
                level="INFO",
            ),
            view=self,
        )

    async def on_timeout(self):
        for item in self.children:
            item.disabled = True

        try:
            if self.message:
                await self.message.edit(
                    embed=make_embed(
                        title="Panel Expired",
                        description=
                        f"{EMOJIS['warning']} This panel has expired.",
                        level="WARNING",
                    ),
                    view=self,
                )
        except Exception:
            pass


class AdminRoleSelectView(discord.ui.View):

    def __init__(self, *, guild: discord.Guild, mode: str):
        super().__init__(timeout=60)

        self.guild = guild
        self.mode = mode
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

        await interaction.response.defer()

        role = self.values[0]

        if self.view_ref.mode == "add":
            added = await add_admin_role(self.view_ref.guild.id, role.id)
            msg = (f"{EMOJIS['success']} {role.mention} added."
                   if added else f"{EMOJIS['warning']} Already configured.")
            level = "SUCCESS" if added else "WARNING"
        else:
            removed = await remove_admin_role(self.view_ref.guild.id, role.id)
            msg = (f"{EMOJIS['success']} {role.mention} removed."
                   if removed else f"{EMOJIS['warning']} Not configured.")
            level = "SUCCESS" if removed else "WARNING"

        await interaction.edit_original_response(
            embed=make_embed(
                title="Bot Admin Roles Updated",
                description=msg,
                level=level,
            ),
            view=None,
        )
