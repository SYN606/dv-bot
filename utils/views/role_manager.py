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
            placeholder=f"{EMOJIS['moderation']}Pick some shiny new roles",
            min_values=1,
            max_values=10,
        )
        self.manager = manager

    async def callback(self, interaction: discord.Interaction):
        if not self.manager.is_authorized(interaction):
            await interaction.response.send_message(
                f"{EMOJIS['warning']} Nope. This toy isn’t for you.",
                ephemeral=True,
            )
            return

        for role in self.values:
            self.manager.to_add.add(role.id)
            self.manager.to_remove.discard(role.id)

        await interaction.response.send_message(
            f"{EMOJIS['success']} {len(self.values)} role(s) locked in for **addition** {EMOJIS['heart']}",
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
                        description=f"Yeet {role.name}",
                    ))

        super().__init__(
            placeholder=f"{EMOJIS['enjoy']}Select roles to yeet into the void",
            min_values=1,
            max_values=min(10, len(options)) if options else 1,
            options=options,
            disabled=not options,
        )

    async def callback(self, interaction: discord.Interaction):
        if not self.manager.is_authorized(interaction):
            await interaction.response.send_message(
                f"{EMOJIS['warning']} Nice try. Permission denied.",
                ephemeral=True,
            )
            return

        for value in self.values:
            role_id = int(value)
            self.manager.to_remove.add(role_id)
            self.manager.to_add.discard(role_id)

        await interaction.response.send_message(
            f"{EMOJIS['success']} {len(self.values)} role(s) marked for **removal** 🧹",
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
    # AUTH CHECK (BOT ADMIN ONLY)
    # ─────────────────────────────
    def is_authorized(self, interaction: discord.Interaction) -> bool:
        if interaction.user != self.actor:
            return False
        return is_bot_admin(interaction)

    # ─────────────────────────────
    # ADD ROLES BUTTON
    # ─────────────────────────────
    @discord.ui.button(
        label="Add Roles",
        style=discord.ButtonStyle.success,
    )
    async def add_roles(self, interaction: discord.Interaction,
                        button: Button):
        if not self.is_authorized(interaction):
            await interaction.response.send_message(
                f"{EMOJIS['warning']} Hands off. This panel isn’t public property.",
                ephemeral=True,
            )
            return

        view = View(timeout=120)
        view.add_item(AddRoleSelect(self))

        await interaction.response.send_message(
            embed=make_embed(
                title=f"{EMOJIS['green_dot']} Add Some Power",
                description=
                ("Choose roles to **grant**.\n\n"
                 f"{EMOJIS['arrow_point']} Nothing is applied yet.\n"
                 f"{EMOJIS['arrow_point']} Click **Done** when you’re satisfied."
                 ),
                level="SYSTEM",
            ),
            view=view,
            ephemeral=True,
        )

    # ─────────────────────────────
    # REMOVE ROLES BUTTON
    # ─────────────────────────────
    @discord.ui.button(
        label=f"{EMOJIS['pants']} Remove Roles",
        style=discord.ButtonStyle.danger,
        emoji="🧹",
    )
    async def remove_roles(self, interaction: discord.Interaction,
                           button: Button):
        if not self.is_authorized(interaction):
            await interaction.response.send_message(
                f"{EMOJIS['warning']} Sorry chief, not your controls.",
                ephemeral=True,
            )
            return

        removable = [
            r for r in self.target.roles if not r.is_default()
            and self.guild.me and r < self.guild.me.top_role
        ]

        if not removable:
            await interaction.response.send_message(
                f"{EMOJIS['warning']} Nothing to remove. They’re already innocent",
                ephemeral=True,
            )
            return

        view = View(timeout=120)
        view.add_item(RemoveRoleSelect(self))

        await interaction.response.send_message(
            embed=make_embed(
                title=f"{EMOJIS['red_dot']} Remove Some Power",
                description=(
                    "Pick roles to **remove**.\n\n"
                    f"{EMOJIS['arrow_point']} Changes are queued.\n"
                    f"{EMOJIS['arrow_point']} Hit **Done** to make it official."
                ),
                level="SYSTEM",
            ),
            view=view,
            ephemeral=True,
        )

    # ─────────────────────────────
    # DONE BUTTON
    # ─────────────────────────────
    @discord.ui.button(
        label="Done",
        style=discord.ButtonStyle.primary,
        emoji="✅",
    )
    async def done(self, interaction: discord.Interaction, button: Button):
        if not self.is_authorized(interaction):
            await interaction.response.send_message(
                f"{EMOJIS['warning']} You can’t finish what you didn’t start.",
                ephemeral=True,
            )
            return

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
                skipped.append(f"{role.mention} (too powerful)")
                continue

            try:
                await self.target.add_roles(
                    role,
                    reason=f"Role manager by {self.actor}",
                )
                added.append(role.mention)
            except discord.Forbidden:
                skipped.append(f"{role.mention} (forbidden)")
            except discord.HTTPException:
                skipped.append(f"{role.mention} (error)")

        for role_id in self.to_remove:
            role = self.guild.get_role(role_id)
            if not role:
                continue
            if role >= bot_member.top_role:
                skipped.append(f"{role.mention} (too powerful)")
                continue

            try:
                await self.target.remove_roles(
                    role,
                    reason=f"Role manager by {self.actor}",
                )
                removed.append(role.mention)
            except discord.Forbidden:
                skipped.append(f"{role.mention} (forbidden)")
            except discord.HTTPException:
                skipped.append(f"{role.mention} (error)")

        if interaction.channel:
            await interaction.channel.send(embed=make_embed(  # type: ignore
                title=f"{EMOJIS['success']} Roles Updated",
                description=
                (f"Target: {self.target.mention}\n\n"
                 f"{EMOJIS['green_dot']} **Added:** {', '.join(added) or 'None'}\n"
                 f"{EMOJIS['red_dot']} **Removed:** {', '.join(removed) or 'None'}\n"
                 f"{EMOJIS['warning']} **Skipped:** {', '.join(skipped) or 'None'}"
                 ),
                level="SUCCESS",
                footer=f"Action by {interaction.user}",
            ))

        for item in self.children:
            item.disabled = True  # type: ignore

        await interaction.edit_original_response(
            content=
            f"{EMOJIS['okay']} Role operation completed. Power redistributed.",
            view=self,
        )

        self.stop()
