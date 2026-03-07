from datetime import datetime
from sqlalchemy import (
    BigInteger,
    Boolean,
    DateTime,
    Integer,
    String,
    Text,
    Index,
)
from sqlalchemy.orm import Mapped, mapped_column

from db.base import Base


# AFK
class AFK(Base):
    __tablename__ = "afk"

    guild_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    user_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)

    reason: Mapped[str] = mapped_column(String, nullable=False)
    since: Mapped[int] = mapped_column(Integer, nullable=False)


# BOT ADMIN ROLES
class AdminRole(Base):
    __tablename__ = "admin_roles"

    guild_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    role_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)


class MediaOnlyChannel(Base):
    __tablename__ = "media_only_channels"

    guild_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    channel_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)

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
        default=False,
        nullable=False,
    )

    auto_mute: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )

    nsfw_bypass: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )


# STICKY MESSAGES
class StickyMessage(Base):
    __tablename__ = "sticky_messages"

    guild_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    channel_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)

    content: Mapped[str] = mapped_column(Text, nullable=False)

    last_message_id: Mapped[int | None] = mapped_column(
        BigInteger,
        nullable=True,
    )

    counter: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )


# SERVER-WIDE DISABLED COMMANDS
class DisabledCommand(Base):
    __tablename__ = "disabled_commands"

    guild_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    command_name: Mapped[str] = mapped_column(
        String(64),
        primary_key=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )


# CHANNEL-BASED COMMAND RESTRICTIONS
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
        default=datetime.utcnow,
        nullable=False,
    )


# COUNTING CHANNELS
class CountingChannel(Base):
    __tablename__ = "counting_channels"

    guild_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    channel_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)

    current: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    last_user_id: Mapped[int | None] = mapped_column(
        BigInteger,
        nullable=True,
    )

    best: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )


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
        default=datetime.utcnow,
        nullable=False,
    )

    expires_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
    )

    __table_args__ = (Index("idx_tempban_active", "guild_id", "active"), )

    def __repr__(self) -> str:
        return (f"<TempbanRecord guild={self.guild_id} "
                f"user={self.user_id} active={self.active}>")


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


# MODERATION LOG CONFIG
class ModerationLogConfig(Base):
    __tablename__ = "moderation_log_config"

    guild_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    channel_id: Mapped[int] = mapped_column(BigInteger, nullable=False)

    def __repr__(self) -> str:
        return (f"<ModerationLogConfig guild={self.guild_id} "
                f"channel={self.channel_id}>")
