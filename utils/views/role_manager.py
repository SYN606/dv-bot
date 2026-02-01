import discord
from discord.ui import View, Button, RoleSelect, Select

from utils.embeds import make_embed
from utils.emojis import EMOJIS


# ─────────────────────────────────────────────
# ADD ROLE SELECT (all assignable roles)
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
        for role in self.values:
            self.manager.to_add.add(role.id)
            self.manager.to_remove.discard(role.id)

        await interaction.response.send_message(
            f"{EMOJIS['success']} {len(self.values)} role(s) queued for addition.",
            ephemeral=True,
        )


# ─────────────────────────────────────────────
# REMOVE ROLE SELECT (ONLY user roles)
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
                        description=f"Remove {role.name}",
                    ))

        super().__init__(
            placeholder="Select roles to remove",
            min_values=1,
            max_values=min(10, len(options)) if options else 1,
            options=options,
            disabled=not options,
        )

    async def callback(self, interaction: discord.Interaction):
        for value in self.values:
            role_id = int(value)
            self.manager.to_remove.add(role_id)
            self.manager.to_add.discard(role_id)

        await interaction.response.send_message(
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
    # ADD ROLES BUTTON
    # ─────────────────────────────
    @discord.ui.button(label="Add Roles", style=discord.ButtonStyle.success)
    async def add_roles(
        self,
        interaction: discord.Interaction,
        button: Button,
    ):
        view = View(timeout=120)
        view.add_item(AddRoleSelect(self))

        await interaction.response.send_message(
            embed=make_embed(
                title="Add Roles",
                description="Select roles to **add** to the user.",
                level="SYSTEM",
            ),
            view=view,
            ephemeral=True,
        )

    # ─────────────────────────────
    # REMOVE ROLES BUTTON
    # ─────────────────────────────
    @discord.ui.button(label="Remove Roles", style=discord.ButtonStyle.danger)
    async def remove_roles(
        self,
        interaction: discord.Interaction,
        button: Button,
    ):
        removable = [
            r for r in self.target.roles if not r.is_default()
            and self.guild.me and r < self.guild.me.top_role
        ]

        if not removable:
            await interaction.response.send_message(
                f"{EMOJIS['warning']} This user has no removable roles.",
                ephemeral=True,
            )
            return

        view = View(timeout=120)
        view.add_item(RemoveRoleSelect(self))

        await interaction.response.send_message(
            embed=make_embed(
                title="Remove Roles",
                description="Select roles to **remove** from the user.",
                level="SYSTEM",
            ),
            view=view,
            ephemeral=True,
        )

    # ─────────────────────────────
    # DONE BUTTON
    # ─────────────────────────────
    @discord.ui.button(label="Done", style=discord.ButtonStyle.primary)
    async def done(
        self,
        interaction: discord.Interaction,
        button: Button,
    ):
        # Acknowledge interaction
        await interaction.response.defer(ephemeral=True)

        bot_member = self.guild.me
        if bot_member is None:
            return

        added: list[str] = []
        removed: list[str] = []
        skipped: list[str] = []

        for role_id in self.to_add:
            role = self.guild.get_role(role_id)
            if not role:
                continue
            if role >= bot_member.top_role:
                skipped.append(f"{role.mention} (higher than bot)")
                continue

            await self.target.add_roles(role)
            added.append(role.mention)

        for role_id in self.to_remove:
            role = self.guild.get_role(role_id)
            if not role:
                continue
            if role >= bot_member.top_role:
                skipped.append(f"{role.mention} (higher than bot)")
                continue

            await self.target.remove_roles(role)
            removed.append(role.mention)

        # Public confirmation message
        if interaction.channel:
            await interaction.channel.send(embed=make_embed( # type: ignore
                title="Roles Updated",
                description=
                (f"{EMOJIS['success']} Roles updated for {self.target.mention}\n\n"
                 f"**Added:** {', '.join(added) or 'None'}\n"
                 f"**Removed:** {', '.join(removed) or 'None'}\n"
                 f"{EMOJIS['red_dot']} **Skipped:** {', '.join(skipped) or 'None'}"
                 ),
                level="SUCCESS",
                footer=f"Action by {interaction.user}",
            ))

        # Disable UI
        for item in self.children:
            item.disabled = True  # type: ignore

        await interaction.edit_original_response(
            content="Role update completed.",
            view=self,
        )

        self.stop()
