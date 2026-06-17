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
from sqlalchemy.orm import Mapped, mapped_column
from db.base import Base


# Shared Timestamps Mixin
class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )


# AFK System
class AFK(Base):
    __tablename__ = "afk"

    guild_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    user_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    afk_reason: Mapped[str] = mapped_column(String(256), nullable=False)
    since: Mapped[int] = mapped_column(Integer, nullable=False)

    __table_args__ = (
        CheckConstraint("guild_id > 0", name="chk_afk_guild_id"),
        CheckConstraint("user_id > 0", name="chk_afk_user_id"),
    )

    def __repr__(self) -> str:
        return f"<AFK guild={self.guild_id} user={self.user_id}>"


# Bot Admin Roles Configuration
class AdminRole(Base):
    __tablename__ = "admin_roles"

    guild_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    role_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)

    __table_args__ = (CheckConstraint("guild_id > 0", name="chk_admin_role_guild"),)

    def __repr__(self) -> str:
        return f"<AdminRole guild={self.guild_id} role={self.role_id}>"


# Media-Only Channel Configurations
class MediaOnlyChannel(Base, TimestampMixin):
    __tablename__ = "media_only_channels"

    guild_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    channel_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    sticky_message_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    whitelist_role_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    image_only: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="0"
    )
    auto_mute: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="0")
    nsfw_bypass: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="1"
    )

    __table_args__ = (CheckConstraint("guild_id > 0", name="chk_media_guild_id"),)


# Sticky Messages Configuration
class StickyMessage(Base, TimestampMixin):
    __tablename__ = "sticky_messages"

    guild_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    channel_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    sticky_content: Mapped[str] = mapped_column(Text, nullable=False)
    last_message_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    counter: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")

    __table_args__ = (CheckConstraint("counter >= 0", name="chk_sticky_counter"),)


# Disabled Server Commands
class DisabledCommand(Base):
    __tablename__ = "disabled_commands"

    guild_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    command_name: Mapped[str] = mapped_column(String(64), primary_key=True)


# Channel Restricted Commands
class RestrictedCommand(Base):
    __tablename__ = "restricted_commands"

    guild_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    channel_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    command_name: Mapped[str] = mapped_column(String(64), primary_key=True)
    restriction_scope: Mapped[str] = mapped_column(
        Enum("allow", "deny", "both", name="restriction_scope_enum"),
        nullable=False,
        server_default="both",
    )


# Temporary Ban Configurations
class TempbanConfig(Base):
    __tablename__ = "tempban_config"

    guild_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    role_id: Mapped[int] = mapped_column(BigInteger, nullable=False)

    def __repr__(self) -> str:
        return f"<TempbanConfig guild={self.guild_id} role={self.role_id}>"


# Temporary Ban Execution Tracking
class TempbanRecord(Base, TimestampMixin):
    __tablename__ = "tempban_records"

    guild_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    user_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    moderator_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    tempban_reason: Mapped[str | None] = mapped_column(String(512), nullable=True)
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="1")
    expires_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    __table_args__ = (
        Index("idx_tempban_active_lookup", "guild_id", "active"),
        Index("idx_tempban_expiry", "expires_at"),
    )

    def __repr__(self) -> str:
        return f"<TempbanRecord guild={self.guild_id} user={self.user_id} active={self.active}>"


# Verification Configuration (Cleaned & Message ID Column Dropped)
class VerificationConfig(Base, TimestampMixin):
    __tablename__ = "verification_config"

    guild_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    verify_channel_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    log_channel_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    verified_role_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    unverified_role_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)


# Core System Moderation Logging Setup
class ModerationLogConfig(Base, TimestampMixin):
    __tablename__ = "moderation_log_config"

    guild_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    channel_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="1")

    def __repr__(self) -> str:
        return f"<ModerationLogConfig guild={self.guild_id} channel={self.channel_id}>"


# Channel Permission Lockdown Backups
class ChannelPermissionSnapshot(Base, TimestampMixin):
    __tablename__ = "channel_permission_snapshots"

    guild_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    channel_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    target_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    permission_name: Mapped[str] = mapped_column(String(64), primary_key=True)
    permission_value: Mapped[bool | None] = mapped_column(Boolean, nullable=True)


# Infraction Warnings System
class WarningRecord(Base, TimestampMixin):
    __tablename__ = "warnings"

    warn_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    guild_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    user_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    moderator_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    reason: Mapped[str] = mapped_column(
        String(512), nullable=False, server_default="No reason provided"
    )

    __table_args__ = (
        Index("idx_warning_guild_user", "guild_id", "user_id"),
        CheckConstraint("guild_id > 0", name="chk_warn_guild_id"),
        CheckConstraint("user_id > 0", name="chk_warn_user_id"),
        CheckConstraint("moderator_id > 0", name="chk_warn_mod_id"),
    )

    def __repr__(self) -> str:
        return f"<WarningRecord id={self.warn_id} guild={self.guild_id} user={self.user_id}>"
