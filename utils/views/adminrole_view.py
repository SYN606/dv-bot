import discord

from utils.embeds import make_embed
from utils.emojis import EMOJIS
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
    # SECURITY CHECK
    # ─────────────────────────
    async def interaction_check(
        self,
        interaction: discord.Interaction,
    ) -> bool:

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

        await interaction.response.send_message(
            embed=make_embed(
                title="Add Bot Admin Role",
                description=f"{EMOJIS['arrow_point']} Select a role to add.",
                level="INFO",
            ),
            view=AdminRoleSelectView(
                guild=self.guild,
                actor_id=self.actor_id,
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
                actor_id=self.actor_id,
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

    # ─────────────────────────
    # TIMEOUT
    # ─────────────────────────
    async def on_timeout(self):

        for item in self.children:
            item.disabled = True  # type: ignore

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


# ─────────────────────────────────────
# ROLE SELECT VIEW
# ─────────────────────────────────────
class AdminRoleSelectView(discord.ui.View):

    def __init__(
        self,
        *,
        guild: discord.Guild,
        actor_id: int,
        mode: str,
    ):
        super().__init__(timeout=60)

        self.guild = guild
        self.actor_id = actor_id
        self.mode = mode

        self.add_item(AdminRoleSelect(self))

    async def interaction_check(
        self,
        interaction: discord.Interaction,
    ) -> bool:

        if interaction.user.id != self.actor_id:
            await interaction.response.send_message(
                embed=make_embed(
                    title="Unauthorized",
                    description=
                    f"{EMOJIS['fail']} You cannot use this selection.",
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

        await interaction.response.defer()

        role = self.values[0]

        # Extra defensive check
        if role.is_default():
            return await interaction.edit_original_response(
                embed=make_embed(
                    title="Invalid Role",
                    description=f"{EMOJIS['fail']} You cannot use @everyone.",
                    level="ERROR",
                ),
                view=None,
            )

        if self.view_ref.mode == "add":
            added = await add_admin_role(
                self.view_ref.guild.id,
                role.id,
            )
            msg = (f"{EMOJIS['success']} {role.mention} added."
                   if added else f"{EMOJIS['warning']} Already configured.")
            level = "SUCCESS" if added else "WARNING"

        else:
            removed = await remove_admin_role(
                self.view_ref.guild.id,
                role.id,
            )
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
