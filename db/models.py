# pyright: reportIncompatibleVariableOverride=false
from __future__ import annotations

from enum import Enum as PyEnum
from typing import TYPE_CHECKING
from tortoise import fields
from tortoise.models import Model
from tortoise.validators import MinValueValidator

if TYPE_CHECKING:
    from tortoise.fields import ReverseRelation


# --- Enums ---
class MatchType(str, PyEnum):
    EXACT = "exact"
    CONTAINS = "contains"
    STARTSWITH = "startswith"
    ENDSWITH = "endswith"
    REGEX = "regex"


class RestrictionScope(str, PyEnum):
    ALLOW = "allow"
    DENY = "deny"
    BOTH = "both"


class FeatureModule(str, PyEnum):
    AUTO_ROLE = "auto_role"
    XP_SYSTEM = "xp_system"
    AUTO_MOD = "auto_mod"
    COMMANDS = "commands"
    MEDIA_ONLY = "media_only"


class PunishmentType(str, PyEnum):
    KICK = "kick"
    BAN = "ban"
    UNBAN = "unban"
    TIMEOUT = "timeout"
    REMOVE_TIMEOUT = "remove_timeout"


# --- Abstract Base Mixins ---
class TimestampMixin:
    created_at = fields.DatetimeField(auto_now_add=True)
    updated_at = fields.DatetimeField(auto_now=True)


# --- Core Foundation Models ---


class Guild(Model, TimestampMixin):
    guild_id = fields.BigIntField(pk=True, validators=[MinValueValidator(1)])

    if TYPE_CHECKING:
        auto_role_config: AutoRoleRewardConfig | None
        role_restrictions: ReverseRelation[RoleRestriction]
        channel_restrictions: ReverseRelation[ChannelRestriction]

    class Meta:
        table = "guilds"

    def __repr__(self) -> str:
        return f"<Guild id={self.guild_id}>"


class User(Model, TimestampMixin):
    user_id = fields.BigIntField(pk=True, validators=[MinValueValidator(1)])

    class Meta:
        table = "users"

    def __repr__(self) -> str:
        return f"<User id={self.user_id}>"


# --- Universal Restriction Models (Allowlists & Blacklists) ---


class RoleRestriction(Model, TimestampMixin):
    """Generic role restriction table supporting both Allowlists and Blacklists per feature."""

    id = fields.BigIntField(pk=True)
    guild = fields.ForeignKeyField(
        "models.Guild",
        related_name="role_restrictions",
        on_delete=fields.CASCADE,
    )
    role_id = fields.BigIntField(validators=[MinValueValidator(1)])
    feature = fields.CharEnumField(FeatureModule, max_length=32)
    restriction_type = fields.CharEnumField(RestrictionScope, max_length=16)

    if TYPE_CHECKING:
        guild_id: int

    class Meta:
        table = "role_restrictions"
        unique_together = (("guild", "role_id", "feature",
                            "restriction_type"), )
        indexes = (("guild", "feature", "restriction_type"), )

    def __repr__(self) -> str:
        return (f"<RoleRestriction guild={self.guild_id} role={self.role_id} "
                f"feature={self.feature} type={self.restriction_type}>")


class ChannelRestriction(Model, TimestampMixin):
    """Generic channel restriction table supporting both Allowlists and Blacklists per feature."""

    id = fields.BigIntField(pk=True)
    guild = fields.ForeignKeyField(
        "models.Guild",
        related_name="channel_restrictions",
        on_delete=fields.CASCADE,
    )
    channel_id = fields.BigIntField(validators=[MinValueValidator(1)])
    feature = fields.CharEnumField(FeatureModule, max_length=32)
    restriction_type = fields.CharEnumField(RestrictionScope, max_length=16)

    if TYPE_CHECKING:
        guild_id: int

    class Meta:
        table = "channel_restrictions"
        unique_together = (("guild", "channel_id", "feature",
                            "restriction_type"), )
        indexes = (("guild", "feature", "restriction_type"), )

    def __repr__(self) -> str:
        return (
            f"<ChannelRestriction guild={self.guild_id} channel={self.channel_id} "
            f"feature={self.feature} type={self.restriction_type}>")


# --- Relational Models ---


class AFK(Model, TimestampMixin):
    id = fields.IntField(pk=True)
    guild = fields.ForeignKeyField(
        "models.Guild",
        related_name="afk_users",
        on_delete=fields.CASCADE,
        null=True,
    )
    user = fields.ForeignKeyField(
        "models.User",
        related_name="afk_records",
        on_delete=fields.CASCADE,
    )
    afk_reason = fields.CharField(max_length=256)
    since = fields.IntField()
    is_global = fields.BooleanField(default=False)
    original_nickname = fields.CharField(max_length=32,
                                         null=True)  # type: ignore

    if TYPE_CHECKING:
        guild_id: int | None
        user_id: int
        original_nickname: str | None

    class Meta:
        table = "afk"
        indexes = (
            ("user", "is_global"),
            ("guild", "user"),
        )


class AdminRole(Model):
    guild = fields.ForeignKeyField(
        "models.Guild",
        related_name="admin_roles",
        on_delete=fields.CASCADE,
    )
    role_id = fields.BigIntField(validators=[MinValueValidator(1)])

    if TYPE_CHECKING:
        guild_id: int

    class Meta:
        table = "admin_roles"
        unique_together = (("guild", "role_id"), )

    def __repr__(self) -> str:
        return f"<AdminRole guild_id={self.guild_id} role={self.role_id}>"


class VCRoleConfig(Model, TimestampMixin):
    guild = fields.OneToOneField(
        "models.Guild",
        pk=True,
        related_name="vc_role_config",
        on_delete=fields.CASCADE,
    )
    role_id = fields.BigIntField(validators=[MinValueValidator(1)])

    if TYPE_CHECKING:
        guild_id: int

    class Meta:
        table = "vc_role_config"

    def __repr__(self) -> str:
        return f"<VCRoleConfig guild_id={self.guild_id} role={self.role_id}>"


class MediaOnlyChannel(Model, TimestampMixin):
    guild = fields.ForeignKeyField(
        "models.Guild",
        related_name="media_channels",
        on_delete=fields.CASCADE,
    )
    channel_id = fields.BigIntField(validators=[MinValueValidator(1)])
    sticky_message_id = fields.BigIntField(null=True)
    whitelist_role_id = fields.BigIntField(null=True)
    image_only = fields.BooleanField(default=False)
    auto_mute = fields.BooleanField(default=False)
    nsfw_bypass = fields.BooleanField(default=True)

    if TYPE_CHECKING:
        guild_id: int

    class Meta:
        table = "media_only_channels"
        unique_together = (("guild", "channel_id"), )


class StickyMessage(Model, TimestampMixin):
    guild = fields.ForeignKeyField(
        "models.Guild",
        related_name="sticky_messages",
        on_delete=fields.CASCADE,
    )
    channel_id = fields.BigIntField(validators=[MinValueValidator(1)])
    sticky_content = fields.TextField()
    last_message_id = fields.BigIntField(null=True)
    counter = fields.IntField(default=0, validators=[MinValueValidator(0)])

    if TYPE_CHECKING:
        guild_id: int

    class Meta:
        table = "sticky_messages"
        unique_together = (("guild", "channel_id"), )


class DisabledCommand(Model):
    guild = fields.ForeignKeyField(
        "models.Guild",
        related_name="disabled_commands",
        on_delete=fields.CASCADE,
    )
    command_name = fields.CharField(max_length=64)

    if TYPE_CHECKING:
        guild_id: int

    class Meta:
        table = "disabled_commands"
        unique_together = (("guild", "command_name"), )


class RestrictedCommand(Model):
    guild = fields.ForeignKeyField(
        "models.Guild",
        related_name="restricted_commands",
        on_delete=fields.CASCADE,
    )
    channel_id = fields.BigIntField(validators=[MinValueValidator(1)])
    command_name = fields.CharField(max_length=64)
    restriction_scope = fields.CharEnumField(
        RestrictionScope,
        default=RestrictionScope.BOTH,
        max_length=16,
    )

    if TYPE_CHECKING:
        guild_id: int

    class Meta:
        table = "restricted_commands"
        unique_together = (("guild", "channel_id", "command_name"), )


class TempbanConfig(Model):
    guild = fields.OneToOneField(
        "models.Guild",
        pk=True,
        related_name="tempban_config",
        on_delete=fields.CASCADE,
    )
    role_id = fields.BigIntField(validators=[MinValueValidator(1)])

    if TYPE_CHECKING:
        guild_id: int

    class Meta:
        table = "tempban_config"

    def __repr__(self) -> str:
        return f"<TempbanConfig guild_id={self.guild_id} role={self.role_id}>"


class TempbanRecord(Model, TimestampMixin):
    guild = fields.ForeignKeyField(
        "models.Guild",
        related_name="tempban_records",
        on_delete=fields.CASCADE,
    )
    user = fields.ForeignKeyField(
        "models.User",
        related_name="tempbans",
        on_delete=fields.CASCADE,
    )
    moderator = fields.ForeignKeyField(
        "models.User",
        related_name="issued_tempbans",
        on_delete=fields.CASCADE,
    )
    tempban_reason = fields.CharField(max_length=512, null=True)
    active = fields.BooleanField(default=True)
    expires_at = fields.DatetimeField(null=True)

    if TYPE_CHECKING:
        guild_id: int
        user_id: int

    class Meta:
        table = "tempban_records"
        unique_together = (("guild", "user"), )
        indexes = (
            ("guild", "active"),
            ("expires_at", ),
        )

    def __repr__(self) -> str:
        return f"<TempbanRecord guild_id={self.guild_id} user_id={self.user_id} active={self.active}>"


class VerificationConfig(Model, TimestampMixin):
    guild = fields.OneToOneField(
        "models.Guild",
        pk=True,
        related_name="verification_config",
        on_delete=fields.CASCADE,
    )
    verify_channel_id = fields.BigIntField(null=True)
    log_channel_id = fields.BigIntField(null=True)
    verified_role_id = fields.BigIntField(null=True)
    unverified_role_id = fields.BigIntField(null=True)

    if TYPE_CHECKING:
        guild_id: int

    class Meta:
        table = "verification_config"


class ModerationLogConfig(Model, TimestampMixin):
    guild = fields.OneToOneField(
        "models.Guild",
        pk=True,
        related_name="modlog_config",
        on_delete=fields.CASCADE,
    )
    channel_id = fields.BigIntField(validators=[MinValueValidator(1)])
    enabled = fields.BooleanField(default=True)

    if TYPE_CHECKING:
        guild_id: int

    class Meta:
        table = "moderation_log_config"

    def __repr__(self) -> str:
        return f"<ModerationLogConfig guild_id={self.guild_id} channel={self.channel_id}>"


class ChannelPermissionSnapshot(Model, TimestampMixin):
    guild = fields.ForeignKeyField(
        "models.Guild",
        related_name="permission_snapshots",
        on_delete=fields.CASCADE,
    )
    channel_id = fields.BigIntField(validators=[MinValueValidator(1)])
    target_id = fields.BigIntField(validators=[MinValueValidator(1)])
    permission_name = fields.CharField(max_length=64)
    permission_value = fields.BooleanField(null=True)

    if TYPE_CHECKING:
        guild_id: int

    class Meta:
        table = "channel_permission_snapshots"
        unique_together = ((
            "guild",
            "channel_id",
            "target_id",
            "permission_name",
        ), )


class WarningRecord(Model, TimestampMixin):
    warn_id = fields.IntField(pk=True)
    guild = fields.ForeignKeyField(
        "models.Guild",
        related_name="warnings",
        on_delete=fields.CASCADE,
    )
    user = fields.ForeignKeyField(
        "models.User",
        related_name="received_warnings",
        on_delete=fields.CASCADE,
    )
    moderator = fields.ForeignKeyField(
        "models.User",
        related_name="issued_warnings",
        on_delete=fields.CASCADE,
    )
    reason = fields.CharField(max_length=512, default="No reason provided")

    if TYPE_CHECKING:
        guild_id: int
        user_id: int

    class Meta:
        table = "warnings"
        indexes = (("guild", "user"), )

    def __repr__(self) -> str:
        return f"<WarningRecord id={self.warn_id} guild_id={self.guild_id} user_id={self.user_id}>"


class PunishmentRecord(Model, TimestampMixin):
    id = fields.IntField(pk=True)
    guild = fields.ForeignKeyField(
        "models.Guild",
        related_name="punishments",
        on_delete=fields.CASCADE,
    )
    user = fields.ForeignKeyField(
        "models.User",
        related_name="punishments_received",
        on_delete=fields.CASCADE,
    )
    moderator = fields.ForeignKeyField(
        "models.User",
        related_name="punishments_issued",
        on_delete=fields.CASCADE,
    )
    action_type = fields.CharEnumField(PunishmentType, max_length=32)
    reason = fields.CharField(max_length=512, default="No reason provided")
    duration_seconds = fields.BigIntField(null=True)

    if TYPE_CHECKING:
        guild_id: int
        user_id: int
        moderator_id: int

    class Meta:
        table = "punishment_records"
        indexes = (("guild", "user"), ("action_type", ))

    def __repr__(self) -> str:
        return f"<PunishmentRecord type={self.action_type} guild_id={self.guild_id} user_id={self.user_id}>"


class AutoResponder(Model, TimestampMixin):
    responder_id = fields.IntField(pk=True)
    guild = fields.ForeignKeyField(
        "models.Guild",
        related_name="autoresponders",
        on_delete=fields.CASCADE,
    )
    trigger_phrase = fields.CharField(max_length=256)
    match_type = fields.CharEnumField(
        MatchType,
        default=MatchType.CONTAINS,
        max_length=16,
    )
    reply_content = fields.TextField(null=True)
    is_embed = fields.BooleanField(default=False)
    embed_title = fields.CharField(max_length=256, null=True)
    image_url = fields.CharField(max_length=512, null=True)
    enabled = fields.BooleanField(default=True)
    ignore_bots = fields.BooleanField(default=True)
    delete_trigger = fields.BooleanField(default=False)
    cooldown = fields.IntField(default=0, validators=[MinValueValidator(0)])

    if TYPE_CHECKING:
        guild_id: int
        reactions: ReverseRelation[AutoResponderReaction]

    class Meta:
        table = "autoresponders"
        indexes = (("guild", "enabled"), )


class AutoResponderReaction(Model):
    id = fields.IntField(pk=True)
    responder = fields.ForeignKeyField(
        "models.AutoResponder",
        related_name="reactions",
        on_delete=fields.CASCADE,
    )
    emoji = fields.CharField(max_length=64)

    if TYPE_CHECKING:
        responder_id: int

    class Meta:
        table = "autoresponder_reactions"
        unique_together = (("responder", "emoji"), )

    def __repr__(self) -> str:
        return f"<AutoResponderReaction responder_id={self.responder_id} emoji={self.emoji}>"


# --- Analytics & Tracking Models ---


class MemberAnalytics(Model, TimestampMixin):
    id = fields.BigIntField(pk=True)
    guild = fields.ForeignKeyField(
        "models.Guild",
        related_name="member_analytics",
        on_delete=fields.CASCADE,
    )
    user = fields.ForeignKeyField(
        "models.User",
        related_name="guild_analytics",
        on_delete=fields.CASCADE,
    )

    joined_at = fields.DatetimeField()
    left_at = fields.DatetimeField(null=True)
    is_active = fields.BooleanField(default=True)

    total_messages = fields.BigIntField(default=0,
                                        validators=[MinValueValidator(0)])
    weekly_messages = fields.BigIntField(default=0,
                                         validators=[MinValueValidator(0)])
    total_vc_seconds = fields.BigIntField(default=0,
                                          validators=[MinValueValidator(0)])
    weekly_vc_seconds = fields.BigIntField(default=0,
                                           validators=[MinValueValidator(0)])

    active_vc_start = fields.DatetimeField(null=True)
    last_active_at = fields.DatetimeField(null=True)

    if TYPE_CHECKING:
        guild_id: int
        user_id: int

    class Meta:
        table = "member_analytics"
        unique_together = (("guild", "user"), )
        indexes = (
            ("guild", "is_active"),
            ("guild", "weekly_messages"),
            ("guild", "weekly_vc_seconds"),
        )


class DailyActivitySnapshot(Model):
    id = fields.BigIntField(pk=True)
    guild = fields.ForeignKeyField(
        "models.Guild",
        related_name="daily_snapshots",
        on_delete=fields.CASCADE,
    )
    date = fields.DateField()

    joins_count = fields.IntField(default=0)
    leaves_count = fields.IntField(default=0)
    total_messages = fields.BigIntField(default=0)
    total_vc_seconds = fields.BigIntField(default=0)
    peak_active_members = fields.IntField(default=0)

    if TYPE_CHECKING:
        guild_id: int

    class Meta:
        table = "daily_activity_snapshots"
        unique_together = (("guild", "date"), )
        indexes = (("guild", "date"), )


class ChannelActivity(Model):
    id = fields.BigIntField(pk=True)
    guild = fields.ForeignKeyField(
        "models.Guild",
        related_name="channel_activities",
        on_delete=fields.CASCADE,
    )
    channel_id = fields.BigIntField(validators=[MinValueValidator(1)])
    date = fields.DateField()

    message_count = fields.BigIntField(default=0)
    vc_seconds_spent = fields.BigIntField(default=0)

    if TYPE_CHECKING:
        guild_id: int

    class Meta:
        table = "channel_activities"
        unique_together = (("guild", "channel_id", "date"), )


class HourlyActivity(Model):
    id = fields.BigIntField(pk=True)
    guild = fields.ForeignKeyField(
        "models.Guild",
        related_name="hourly_activities",
        on_delete=fields.CASCADE,
    )
    day_of_week = fields.IntField(validators=[MinValueValidator(0)
                                              ])  # 0=Monday, 6=Sunday
    hour_of_day = fields.IntField(validators=[MinValueValidator(0)])  # 0 to 23

    message_count = fields.BigIntField(default=0)
    vc_seconds = fields.BigIntField(default=0)

    if TYPE_CHECKING:
        guild_id: int

    class Meta:
        table = "hourly_activities"
        unique_together = (("guild", "day_of_week", "hour_of_day"), )


class AutoRoleRewardConfig(Model, TimestampMixin):
    guild = fields.OneToOneField(
        "models.Guild",
        pk=True,
        related_name="auto_role_config",
        on_delete=fields.CASCADE,
    )
    announcement_channel_id = fields.BigIntField(null=True)

    # Top 3 Chat Roles
    top_chat_role_1 = fields.BigIntField(null=True)
    top_chat_role_2 = fields.BigIntField(null=True)
    top_chat_role_3 = fields.BigIntField(null=True)

    # Top 3 VC Roles
    top_vc_role_1 = fields.BigIntField(null=True)
    top_vc_role_2 = fields.BigIntField(null=True)
    top_vc_role_3 = fields.BigIntField(null=True)

    if TYPE_CHECKING:
        guild_id: int

    class Meta:
        table = "auto_role_reward_config"


class TagConfig(Model, TimestampMixin):
    guild = fields.ForeignKeyField(
        "models.Guild",
        related_name="tag_config",
        on_delete=fields.CASCADE,
        pk=True,
    )
    tag = fields.CharField(max_length=32)
    role_id = fields.BigIntField(validators=[MinValueValidator(1)])

    if TYPE_CHECKING:
        guild_id: int

    class Meta:
        table = "tag_configs"

    def __repr__(self) -> str:
        return f"<TagConfig guild_id={self.guild_id} tag={self.tag!r} role_id={self.role_id}>"
