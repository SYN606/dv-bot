import discord
from discord.ui import View, Button, RoleSelect, Select

from utils.embeds import make_embed
from utils.emojis import EMOJIS
from utils.check_perms import is_bot_admin


# ─────────────────────────────────────────────
# ADD ROLE SELECT
# ─────────────────────────────────────────────
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
            await interaction.followup.send(
                f"{EMOJIS['warning']} You are not authorized to use this menu.",
                ephemeral=True,
            )
            return

        for role in self.values:
            self.manager.to_add.add(role.id)
            self.manager.to_remove.discard(role.id)

        await interaction.followup.send(
            f"{EMOJIS['success']} {len(self.values)} role(s) queued for addition.",
            ephemeral=True,
        )


# ─────────────────────────────────────────────
# REMOVE ROLE SELECT
# ─────────────────────────────────────────────
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
            await interaction.followup.send(
                f"{EMOJIS['warning']} You are not authorized to use this menu.",
                ephemeral=True,
            )
            return

        for value in self.values:
            role_id = int(value)
            self.manager.to_remove.add(role_id)
            self.manager.to_add.discard(role_id)

        await interaction.followup.send(
            f"{EMOJIS['success']} {len(self.values)} role(s) queued for removal.",
            ephemeral=True,
        )


# ─────────────────────────────────────────────
# ROLE MANAGER VIEW
# ─────────────────────────────────────────────
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

    # ─────────────────────────────
    # AUTH CHECK
    # ─────────────────────────────
    def is_authorized(self, interaction: discord.Interaction) -> bool:
        return interaction.user == self.actor and is_bot_admin(interaction)

    # ─────────────────────────────
    # ADD ROLES BUTTON
    # ─────────────────────────────
    @discord.ui.button(label="Add Roles", style=discord.ButtonStyle.success)
    async def add_roles(self, interaction: discord.Interaction,
                        button: Button):
        if not self.is_authorized(interaction):
            await interaction.followup.send(
                f"{EMOJIS['warning']} You do not have permission to do this.",
                ephemeral=True,
            )
            return

        view = View(timeout=120)
        view.add_item(AddRoleSelect(self))

        await interaction.followup.send(
            embed=make_embed(
                title="Add Roles",
                description=
                "Select roles to grant. Changes apply after clicking **Done**.",
                level="SYSTEM",
            ),
            view=view,
            ephemeral=True,
        )

    # ─────────────────────────────
    # REMOVE ROLES BUTTON
    # ─────────────────────────────
    @discord.ui.button(label="Remove Roles", style=discord.ButtonStyle.danger)
    async def remove_roles(self, interaction: discord.Interaction,
                           button: Button):
        if not self.is_authorized(interaction):
            await interaction.followup.send(
                f"{EMOJIS['warning']} You do not have permission to do this.",
                ephemeral=True,
            )
            return

        removable = [
            r for r in self.target.roles if not r.is_default()
            and self.guild.me and r < self.guild.me.top_role
        ]

        if not removable:
            await interaction.followup.send(
                f"{EMOJIS['warning']} No removable roles found.",
                ephemeral=True,
            )
            return

        view = View(timeout=120)
        view.add_item(RemoveRoleSelect(self))

        await interaction.followup.send(
            embed=make_embed(
                title="Remove Roles",
                description=
                "Select roles to remove. Changes apply after clicking **Done**.",
                level="SYSTEM",
            ),
            view=view,
            ephemeral=True,
        )

    # ─────────────────────────────
    # DONE BUTTON
    # ─────────────────────────────
    @discord.ui.button(label="Done", style=discord.ButtonStyle.primary)
    async def done(self, interaction: discord.Interaction, button: Button):
        if not self.is_authorized(interaction):
            await interaction.followup.send(
                f"{EMOJIS['warning']} You are not allowed to complete this action.",
                ephemeral=True,
            )
            return

        await interaction.response.defer(ephemeral=True)

        bot_member = self.guild.me
        if bot_member is None:
            return

        added, removed, skipped = [], [], []

        for role_id in self.to_add:
            role = self.guild.get_role(role_id)
            if not role or role >= bot_member.top_role:
                skipped.append(role.mention if role else "Unknown role")
                continue
            try:
                await self.target.add_roles(
                    role, reason=f"Role manager by {self.actor}")
                added.append(role.mention)
            except discord.HTTPException:
                skipped.append(role.mention)

        for role_id in self.to_remove:
            role = self.guild.get_role(role_id)
            if not role or role >= bot_member.top_role:
                skipped.append(role.mention if role else "Unknown role")
                continue
            try:
                await self.target.remove_roles(
                    role, reason=f"Role manager by {self.actor}")
                removed.append(role.mention)
            except discord.HTTPException:
                skipped.append(role.mention)

        if interaction.channel:
            await interaction.channel.send(embed=make_embed(
                title="Roles Updated",
                description=
                (f"**Target:** {self.target.mention}\n\n"
                 f"{EMOJIS['green_dot']} Added: {', '.join(added) or 'None'}\n"
                 f"{EMOJIS['red_dot']} Removed: {', '.join(removed) or 'None'}\n"
                 f"{EMOJIS['warning']} Skipped: {', '.join(skipped) or 'None'}"
                 ),
                level="SUCCESS",
                footer=f"Action by {interaction.user}",
            ))

        for item in self.children:
            item.disabled = True  # type: ignore

        await interaction.edit_original_response(
            content="Role update completed successfully.",
            view=self,
        )

        self.stop()
