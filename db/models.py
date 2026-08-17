from enum import Enum as PyEnum
from tortoise import fields
from tortoise.models import Model
from tortoise.validators import MinValueValidator


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


# --- Abstract Base Classes / Mixins ---
class TimestampMixin:
    created_at = fields.DatetimeField(auto_now_add=True)
    updated_at = fields.DatetimeField(auto_now=True)


# --- Models ---
class AFK(Model):
    guild_id = fields.BigIntField(validators=[MinValueValidator(1)])
    user_id = fields.BigIntField(validators=[MinValueValidator(1)])
    afk_reason = fields.CharField(max_length=256)
    since = fields.IntField()

    class Meta(Model.Meta):
        table = "afk"
        unique_together = (("guild_id", "user_id"), )

    def __repr__(self) -> str:
        return f"<AFK guild={self.guild_id} user={self.user_id}>"


class AdminRole(Model):
    guild_id = fields.BigIntField(validators=[MinValueValidator(1)])
    role_id = fields.BigIntField()

    class Meta(Model.Meta):
        table = "admin_roles"
        unique_together = (("guild_id", "role_id"), )

    def __repr__(self) -> str:
        return f"<AdminRole guild={self.guild_id} role={self.role_id}>"


class MediaOnlyChannel(Model, TimestampMixin):
    guild_id = fields.BigIntField(validators=[MinValueValidator(1)])
    channel_id = fields.BigIntField()
    sticky_message_id = fields.BigIntField(null=True)
    whitelist_role_id = fields.BigIntField(null=True)
    image_only = fields.BooleanField(default=False)
    auto_mute = fields.BooleanField(default=False)
    nsfw_bypass = fields.BooleanField(default=True)

    class Meta(Model.Meta):
        table = "media_only_channels"
        unique_together = (("guild_id", "channel_id"), )


class StickyMessage(Model, TimestampMixin):
    guild_id = fields.BigIntField()
    channel_id = fields.BigIntField()
    sticky_content = fields.TextField()
    last_message_id = fields.BigIntField(null=True)
    counter = fields.IntField(default=0, validators=[MinValueValidator(0)])

    class Meta(Model.Meta):
        table = "sticky_messages"
        unique_together = (("guild_id", "channel_id"), )


class DisabledCommand(Model):
    guild_id = fields.BigIntField()
    command_name = fields.CharField(max_length=64)

    class Meta(Model.Meta):
        table = "disabled_commands"
        unique_together = (("guild_id", "command_name"), )


class RestrictedCommand(Model):
    guild_id = fields.BigIntField()
    channel_id = fields.BigIntField()
    command_name = fields.CharField(max_length=64)
    restriction_scope = fields.CharEnumField(
        RestrictionScope,
        default=RestrictionScope.BOTH,
        max_length=16,
    )

    class Meta(Model.Meta):
        table = "restricted_commands"
        unique_together = (("guild_id", "channel_id", "command_name"), )


class TempbanConfig(Model):
    guild_id = fields.BigIntField(pk=True)
    role_id = fields.BigIntField()

    class Meta(Model.Meta):
        table = "tempban_config"

    def __repr__(self) -> str:
        return f"<TempbanConfig guild={self.guild_id} role={self.role_id}>"


class TempbanRecord(Model, TimestampMixin):
    guild_id = fields.BigIntField()
    user_id = fields.BigIntField()
    moderator_id = fields.BigIntField()
    tempban_reason = fields.CharField(max_length=512, null=True)
    active = fields.BooleanField(default=True)
    expires_at = fields.DatetimeField(null=True)

    class Meta(Model.Meta):
        table = "tempban_records"
        unique_together = (("guild_id", "user_id"), )
        indexes = (
            ("guild_id", "active"),
            ("expires_at", ),
        )

    def __repr__(self) -> str:
        return f"<TempbanRecord guild={self.guild_id} user={self.user_id} active={self.active}>"


class VerificationConfig(Model, TimestampMixin):
    guild_id = fields.BigIntField(pk=True)
    verify_channel_id = fields.BigIntField(null=True)
    log_channel_id = fields.BigIntField(null=True)
    verified_role_id = fields.BigIntField(null=True)
    unverified_role_id = fields.BigIntField(null=True)

    class Meta(Model.Meta):
        table = "verification_config"


class ModerationLogConfig(Model, TimestampMixin):
    guild_id = fields.BigIntField(pk=True)
    channel_id = fields.BigIntField()
    enabled = fields.BooleanField(default=True)

    class Meta(Model.Meta):
        table = "moderation_log_config"

    def __repr__(self) -> str:
        return f"<ModerationLogConfig guild={self.guild_id} channel={self.channel_id}>"


class ChannelPermissionSnapshot(Model, TimestampMixin):
    guild_id = fields.BigIntField()
    channel_id = fields.BigIntField()
    target_id = fields.BigIntField()
    permission_name = fields.CharField(max_length=64)
    permission_value = fields.BooleanField(null=True)

    class Meta(Model.Meta):
        table = "channel_permission_snapshots"
        unique_together = (("guild_id", "channel_id", "target_id",
                            "permission_name"), )


class WarningRecord(Model, TimestampMixin):
    warn_id = fields.IntField(pk=True)
    guild_id = fields.BigIntField(validators=[MinValueValidator(1)])
    user_id = fields.BigIntField(validators=[MinValueValidator(1)])
    moderator_id = fields.BigIntField(validators=[MinValueValidator(1)])
    reason = fields.CharField(max_length=512, default="No reason provided")

    class Meta(Model.Meta):
        table = "warnings"
        indexes = (("guild_id", "user_id"), )

    def __repr__(self) -> str:
        return f"<WarningRecord id={self.warn_id} guild={self.guild_id} user={self.user_id}>"


class AutoResponder(Model, TimestampMixin):
    responder_id = fields.IntField(pk=True)
    guild_id = fields.BigIntField(validators=[MinValueValidator(1)])
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

    class Meta(Model.Meta):
        table = "autoresponders"
        indexes = (("guild_id", "enabled"), )


class AutoResponderReaction(Model):
    id = fields.IntField(pk=True)
    responder_id = fields.IntField()
    emoji = fields.CharField(max_length=64)

    class Meta(Model.Meta):
        table = "autoresponder_reactions"
        unique_together = (("responder_id", "emoji"), )

    def __repr__(self) -> str:
        return f"<AutoResponderReaction id={self.responder_id} emoji={self.emoji}>"
