from datetime import datetime

from sqlalchemy import (
    BigInteger,
    Boolean,
    DateTime,
    Integer,
    String,
    Text,
    Index,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from db.base import Base


# ─────────────────────────
# AFK
# ─────────────────────────
class AFK(Base):
    __tablename__ = "afk"

    guild_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    user_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)

    reason: Mapped[str] = mapped_column(String, nullable=False)
    since: Mapped[int] = mapped_column(Integer, nullable=False)

    __table_args__ = (Index("idx_afk_lookup", "guild_id", "user_id"), )

    def __repr__(self) -> str:
        return f"<AFK guild={self.guild_id} user={self.user_id}>"


# ─────────────────────────
# BOT ADMIN ROLES
# ─────────────────────────
class AdminRole(Base):
    __tablename__ = "admin_roles"

    guild_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    role_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)

    __table_args__ = (Index("idx_admin_roles_guild", "guild_id"), )

    def __repr__(self) -> str:
        return f"<AdminRole guild={self.guild_id} role={self.role_id}>"


# ─────────────────────────
# MEDIA ONLY CHANNELS
# ─────────────────────────
class MediaOnlyChannel(Base):
    __tablename__ = "media_only_channels"

    guild_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    channel_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)

    sticky_message_id: Mapped[int | None] = mapped_column(BigInteger,
                                                          nullable=True)
    whitelist_role_id: Mapped[int | None] = mapped_column(BigInteger,
                                                          nullable=True)
    image_only: Mapped[bool] = mapped_column(Boolean,
                                             default=False,
                                             nullable=False)
    auto_mute: Mapped[bool] = mapped_column(Boolean,
                                            default=False,
                                            nullable=False)
    nsfw_bypass: Mapped[bool] = mapped_column(Boolean,
                                              default=True,
                                              nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        nullable=False,
    )

    __table_args__ = (Index("idx_media_only_lookup", "guild_id",
                            "channel_id"), )


# ─────────────────────────
# STICKY MESSAGES
# ─────────────────────────
class StickyMessage(Base):
    __tablename__ = "sticky_messages"

    guild_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    channel_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)

    content: Mapped[str] = mapped_column(Text, nullable=False)

    last_message_id: Mapped[int | None] = mapped_column(BigInteger,
                                                        nullable=True)

    counter: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    __table_args__ = (Index("idx_sticky_lookup", "guild_id", "channel_id"), )


# ─────────────────────────
# SERVER DISABLED COMMANDS
# ─────────────────────────
class DisabledCommand(Base):
    __tablename__ = "disabled_commands"

    guild_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)

    command_name: Mapped[str] = mapped_column(
        String(64),
        primary_key=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        nullable=False,
    )

    __table_args__ = (Index("idx_disabled_commands_guild", "guild_id"), )


# ─────────────────────────
# CHANNEL COMMAND RESTRICTIONS
# ─────────────────────────
class RestrictedCommand(Base):
    __tablename__ = "restricted_commands"

    guild_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)

    channel_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)

    command_name: Mapped[str] = mapped_column(
        String(64),
        primary_key=True,
    )

    scope: Mapped[str] = mapped_column(
        String(16),
        default="both",
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        nullable=False,
    )

    __table_args__ = (Index("idx_restricted_lookup", "guild_id",
                            "channel_id"), )

# TEMPBAN CONFIG
class TempbanConfig(Base):
    __tablename__ = "tempban_config"
    guild_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    role_id: Mapped[int] = mapped_column(BigInteger, nullable=False)

    def __repr__(self) -> str:
        return f"<TempbanConfig guild={self.guild_id} role={self.role_id}>"


# TEMPBAN RECORDS
class TempbanRecord(Base):
    __tablename__ = "tempban_records"
    guild_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    user_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    moderator_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    reason: Mapped[str | None] = mapped_column(
        String(512),
        nullable=True,
    )
    active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        nullable=False,
    )
    expires_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
    )
    __table_args__ = (Index("idx_tempban_active", "guild_id", "active"), )

    def __repr__(self) -> str:
        return f"<TempbanRecord guild={self.guild_id} user={self.user_id} active={self.active}>"


# VERIFICATION CONFIG
class VerificationConfig(Base):
    __tablename__ = "verification_config"

    guild_id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
    )
    verify_channel_id: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False,
    )
    log_channel_id: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False,
    )
    verified_role_id: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False,
    )
    unverified_role_id: Mapped[int | None] = mapped_column(
        BigInteger,
        nullable=True,
    )
    verification_message_id: Mapped[int | None] = mapped_column(
        BigInteger,
        nullable=True,
    )

    __table_args__ = (Index("idx_verification_lookup", "guild_id"), )


# MODERATION LOG CONFIG
class ModerationLogConfig(Base):
    __tablename__ = "moderation_log_config"

    guild_id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
    )

    channel_id: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False,
    )

    __table_args__ = (Index("idx_modlog_lookup", "guild_id"), )

    def __repr__(self) -> str:
        return f"<ModerationLogConfig guild={self.guild_id} channel={self.channel_id}>"


class ChannelPermissionSnapshot(Base):
    __tablename__ = "channel_permission_snapshots"

    guild_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    channel_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    target_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)

    send_messages: Mapped[bool | None] = mapped_column(Boolean, nullable=True)

    locked_by: Mapped[int] = mapped_column(BigInteger, nullable=False)

    locked_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        nullable=False,
    )

    __table_args__ = (Index(
        "idx_lock_snapshot_lookup",
        "guild_id",
        "channel_id",
    ), )
