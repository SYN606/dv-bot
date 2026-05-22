from datetime import datetime

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    DateTime,
    Enum,
    Index,
    Integer,
    String,
    Text,
    func,
)

from sqlalchemy.orm import (
    Mapped,
    mapped_column,
)

from db.base import Base


# shared timestamps
class TimestampMixin:

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


# AFK
class AFK(Base):

    __tablename__ = "afk"

    guild_id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
    )

    user_id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
    )

    afk_reason: Mapped[str] = mapped_column(
        String(256),
        nullable=False,
    )

    since: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    __table_args__ = (
        CheckConstraint(
            "guild_id > 0",
            name="chk_afk_guild_id",
        ),
        CheckConstraint(
            "user_id > 0",
            name="chk_afk_user_id",
        ),
    )

    def __repr__(self) -> str:

        return (f"<AFK guild={self.guild_id} "
                f"user={self.user_id}>")


# BOT ADMIN ROLES
class AdminRole(Base):

    __tablename__ = "admin_roles"

    guild_id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
    )

    role_id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
    )

    __table_args__ = (CheckConstraint(
        "guild_id > 0",
        name="chk_admin_role_guild",
    ), )

    def __repr__(self) -> str:

        return (f"<AdminRole guild={self.guild_id} "
                f"role={self.role_id}>")


# MEDIA ONLY CHANNELS
class MediaOnlyChannel(
        Base,
        TimestampMixin,
):

    __tablename__ = "media_only_channels"

    guild_id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
    )

    channel_id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
    )

    sticky_message_id: Mapped[int | None] = mapped_column(
        BigInteger,
        nullable=True,
    )

    whitelist_role_id: Mapped[int | None] = mapped_column(
        BigInteger,
        nullable=True,
    )

    image_only: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default="0",
    )

    auto_mute: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default="0",
    )

    nsfw_bypass: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default="1",
    )

    __table_args__ = (CheckConstraint(
        "guild_id > 0",
        name="chk_media_guild_id",
    ), )


# STICKY MESSAGES
class StickyMessage(
        Base,
        TimestampMixin,
):

    __tablename__ = "sticky_messages"

    guild_id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
    )

    channel_id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
    )

    sticky_content: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    last_message_id: Mapped[int | None] = mapped_column(
        BigInteger,
        nullable=True,
    )

    counter: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        server_default="0",
    )

    __table_args__ = (CheckConstraint(
        "counter >= 0",
        name="chk_sticky_counter",
    ), )


# DISABLED COMMANDS
class DisabledCommand(
        Base,
        TimestampMixin,
):

    __tablename__ = "disabled_commands"

    guild_id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
    )

    command_name: Mapped[str] = mapped_column(
        String(64),
        primary_key=True,
    )

    __table_args__ = (Index(
        "idx_disabled_command_lookup",
        "guild_id",
        "command_name",
    ), )


# RESTRICTED COMMANDS
class RestrictedCommand(
        Base,
        TimestampMixin,
):

    __tablename__ = "restricted_commands"

    guild_id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
    )

    channel_id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
    )

    command_name: Mapped[str] = mapped_column(
        String(64),
        primary_key=True,
    )

    restriction_scope: Mapped[str] = mapped_column(
        Enum(
            "allow",
            "deny",
            "both",
            name="restriction_scope_enum",
        ),
        nullable=False,
        server_default="both",
    )

    __table_args__ = (Index(
        "idx_restricted_command_lookup",
        "guild_id",
        "channel_id",
        "command_name",
    ), )


# TEMPBAN CONFIG
class TempbanConfig(Base):

    __tablename__ = "tempban_config"

    guild_id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
    )

    role_id: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False,
    )

    def __repr__(self) -> str:

        return (f"<TempbanConfig guild={self.guild_id} "
                f"role={self.role_id}>")


# TEMPBAN RECORDS
class TempbanRecord(
        Base,
        TimestampMixin,
):

    __tablename__ = "tempban_records"

    guild_id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
    )

    user_id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
    )

    moderator_id: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False,
    )

    tempban_reason: Mapped[str | None] = mapped_column(
        String(512),
        nullable=True,
    )

    active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default="1",
    )

    expires_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
    )

    __table_args__ = (
        Index(
            "idx_tempban_active_lookup",
            "guild_id",
            "active",
        ),
        Index(
            "idx_tempban_expiry",
            "expires_at",
        ),
    )

    def __repr__(self) -> str:

        return (f"<TempbanRecord guild={self.guild_id} "
                f"user={self.user_id} active={self.active}>")


# VERIFICATION CONFIG
class VerificationConfig(
        Base,
        TimestampMixin,
):

    __tablename__ = "verification_config"

    guild_id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
    )

    verify_channel_id: Mapped[int | None] = mapped_column(
        BigInteger,
        nullable=True,
    )

    log_channel_id: Mapped[int | None] = mapped_column(
        BigInteger,
        nullable=True,
    )

    verified_role_id: Mapped[int | None] = mapped_column(
        BigInteger,
        nullable=True,
    )

    unverified_role_id: Mapped[int | None] = mapped_column(
        BigInteger,
        nullable=True,
    )

    verification_message_id: Mapped[int | None] = mapped_column(
        BigInteger,
        nullable=True,
        unique=True,
    )


# MODERATION LOG CONFIG
class ModerationLogConfig(
        Base,
        TimestampMixin,
):

    __tablename__ = "moderation_log_config"

    guild_id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
    )

    channel_id: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False,
    )

    enabled: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default="1",
    )

    def __repr__(self) -> str:

        return (f"<ModerationLogConfig guild={self.guild_id} "
                f"channel={self.channel_id}>")


class ChannelPermissionSnapshot(
        Base,
        TimestampMixin,
):

    __tablename__ = "channel_permission_snapshots"

    guild_id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
    )

    channel_id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
    )

    target_id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
    )

    permission_name: Mapped[str] = mapped_column(
        String(64),
        primary_key=True,
    )

    permission_value: Mapped[bool | None] = mapped_column(
        Boolean,
        nullable=True,
    )

    __table_args__ = (Index(
        "idx_channel_snapshot_lookup",
        "guild_id",
        "channel_id",
    ), )


# VC MANAGER CONFIG
class VCManagerConfig(
        Base,
        TimestampMixin,
):

    __tablename__ = "vc_manager_config"

    guild_id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
    )
    enabled: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default="0",
    )
    panel_channel_id: Mapped[int | None] = mapped_column(
        BigInteger,
        nullable=True,
    )
    panel_message_id: Mapped[int | None] = mapped_column(
        BigInteger,
        nullable=True,
        unique=True,
    )
    log_channel_id: Mapped[int | None] = mapped_column(
        BigInteger,
        nullable=True,
    )
    drag_enabled: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default="1",
    )
    drag_all_enabled: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default="1",
    )
    role_sync_enabled: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default="1",
    )
    __table_args__ = (Index(
        "idx_vc_manager_lookup",
        "guild_id",
        "enabled",
    ), )

    def __repr__(self) -> str:

        return (f"<VCManagerConfig "
                f"guild={self.guild_id} "
                f"enabled={self.enabled}>")


# VC TRACKED CHANNELS
class VCTrackedChannel(
        Base,
        TimestampMixin,
):

    __tablename__ = "vc_tracked_channels"

    guild_id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
    )
    channel_id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
    )
    role_id: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False,
    )
    enabled: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default="1",
    )
    auto_role: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default="1",
    )
    drag_allowed: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default="1",
    )
    managed_role: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default="1",
    )
    __table_args__ = (
        Index(
            "idx_vc_tracking_lookup",
            "guild_id",
            "channel_id",
        ),
        Index(
            "idx_vc_tracking_role",
            "guild_id",
            "role_id",
        ),
    )

    def __repr__(self) -> str:
        return (f"<VCTrackedChannel "
                f"guild={self.guild_id} "
                f"channel={self.channel_id} "
                f"role={self.role_id}>")
