import discord

from utils.core.embeds import make_embed
from utils.core.emojis import EMOJIS
from utils.permissions.check_perms import is_bot_admin
from utils.logging.mod_log import send_mod_log


class AddRoleSelect(discord.ui.RoleSelect):

    def __init__(self, manager: "RoleManagerView"):
        super().__init__(
            placeholder="Select roles to ADD",
            min_values=0,
            max_values=10,
        )
        self.manager = manager

    async def callback(self, interaction: discord.Interaction):
        self.manager.roles_to_add = list(self.values)

        await interaction.response.send_message(
            f"{EMOJIS['green_dot']} {len(self.values)} role(s) queued for addition.",
            ephemeral=True,
        )


class RemoveRoleSelect(discord.ui.RoleSelect):

    def __init__(self, manager: "RoleManagerView"):
        super().__init__(
            placeholder="Select roles to REMOVE",
            min_values=0,
            max_values=10,
        )
        self.manager = manager

    async def callback(self, interaction: discord.Interaction):
        self.manager.roles_to_remove = list(self.values)

        await interaction.response.send_message(
            f"{EMOJIS['red_dot']} {len(self.values)} role(s) queued for removal.",
            ephemeral=True,
        )


class RoleManagerView(discord.ui.View):

    def __init__(
        self,
        bot: discord.Client,
        actor: discord.Member,
        target: discord.Member,
        guild: discord.Guild,
    ):
        super().__init__(timeout=180)

        self.bot = bot
        self.actor = actor
        self.target = target
        self.guild = guild

        self.roles_to_add: list[discord.Role] = []
        self.roles_to_remove: list[discord.Role] = []

        self.message: discord.Message | None = None

        self.add_item(AddRoleSelect(self))
        self.add_item(RemoveRoleSelect(self))

    async def interaction_check(self, interaction: discord.Interaction):
        if interaction.user != self.actor:
            await interaction.response.send_message(
                f"{EMOJIS['warning']} You cannot use this panel.",
                ephemeral=True,
            )
            return False

        if not await is_bot_admin(interaction):
            return False

        return True

    @discord.ui.button(
        label="Apply Changes",
        style=discord.ButtonStyle.success,
        emoji=EMOJIS["okay"],
    )
    async def apply(self, interaction: discord.Interaction,
                    button: discord.ui.Button):

        await interaction.response.defer()

        bot_member = self.guild.me

        added: list[str] = []
        removed: list[str] = []

        # ================================
        # ADD ROLES
        # ================================
        for role in self.roles_to_add:
            if role.managed:
                continue

            if bot_member and role >= bot_member.top_role:
                continue

            try:
                await self.target.add_roles(
                    role,
                    reason=f"Role manager by {self.actor}",
                )
                added.append(role.name)
            except discord.HTTPException:
                continue

        # ================================
        # REMOVE ROLES
        # ================================
        for role in self.roles_to_remove:
            if role.managed:
                continue

            if bot_member and role >= bot_member.top_role:
                continue

            try:
                await self.target.remove_roles(
                    role,
                    reason=f"Role manager by {self.actor}",
                )
                removed.append(role.name)
            except discord.HTTPException:
                continue

        # ================================
        # DISABLE UI
        # ================================
        for item in self.children:
            item.disabled = True # type: ignore

        # ================================
        # RESPONSE EMBED
        # ================================
        embed = make_embed(
            title="Roles Updated",
            description=(
                f"{EMOJIS['moderation']} Target: {self.target.mention}\n\n"
                f"{EMOJIS['green_dot']} Added: {', '.join(added) or 'None'}\n"
                f"{EMOJIS['red_dot']} Removed: {', '.join(removed) or 'None'}"
            ),
            level="SUCCESS",
        )

        await interaction.edit_original_response(
            embed=embed,
            view=self,
        )

        # ================================
        # LOGGING (ONLY HERE — FIXED)
        # ================================
        if added or removed:
            try:
                await send_mod_log(
                    guild=self.guild,
                    category="ROLE",
                    title="Roles Updated",
                    description=f"Roles updated for {self.target.mention}",
                    level="SUCCESS",
                    actor=self.actor,
                    target=self.target,
                    extra_fields={
                        "Added": ", ".join(added) or "None",
                        "Removed": ", ".join(removed) or "None",
                    },
                )
            except Exception as e:
                print(f"[Role Log Failed] {e}")

        self.stop()

    @discord.ui.button(
        label="Cancel",
        style=discord.ButtonStyle.danger,
    )
    async def cancel(self, interaction: discord.Interaction,
                     button: discord.ui.Button):

        for item in self.children:
            item.disabled = True # type: ignore

        embed = make_embed(
            title="Role Manager Closed",
            description="No changes were applied.",
            level="WARNING",
        )

        await interaction.response.edit_message(
            embed=embed,
            view=self,
        )

        self.stop()

    async def on_timeout(self):
        for item in self.children:
            item.disabled = True # type: ignore

        try:
            if self.message:
                await self.message.edit(view=self)
        except discord.HTTPException:
            pass
