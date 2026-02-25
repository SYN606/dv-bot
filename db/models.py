from datetime import datetime
from sqlalchemy import (
    BigInteger,
    Boolean,
    DateTime,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column

from db.base import Base


# ─────────────────────────────────────
# AFK
# ─────────────────────────────────────
class AFK(Base):
    __tablename__ = "afk"

    guild_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    user_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)

    reason: Mapped[str] = mapped_column(String, nullable=False)
    since: Mapped[int] = mapped_column(Integer, nullable=False)


# ─────────────────────────────────────
# BOT ADMIN ROLES
# ─────────────────────────────────────
class AdminRole(Base):
    __tablename__ = "admin_roles"

    guild_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    role_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)


# ─────────────────────────────────────
# MEDIA ONLY CHANNELS
# ─────────────────────────────────────
class MediaOnlyChannel(Base):
    __tablename__ = "media_only_channels"

    guild_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    channel_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
    )


# ─────────────────────────────────────
# STICKY MESSAGES
# ─────────────────────────────────────
class StickyMessage(Base):
    __tablename__ = "sticky_messages"

    guild_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    channel_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)

    content: Mapped[str] = mapped_column(Text, nullable=False)

    last_message_id: Mapped[int | None] = mapped_column(BigInteger)
    counter: Mapped[int] = mapped_column(Integer, default=0)

    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )


# ─────────────────────────────────────
# SERVER-WIDE DISABLED COMMANDS (LEGACY)
# ─────────────────────────────────────
class DisabledCommand(Base):
    __tablename__ = "disabled_commands"

    guild_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    command_name: Mapped[str] = mapped_column(String(64), primary_key=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
    )


# ─────────────────────────────────────
# CHANNEL-BASED COMMAND RESTRICTIONS (v2)
# ─────────────────────────────────────
class RestrictedCommand(Base):
    """
    Channel-based command restriction.

    scope:
      - "prefix"
      - "slash"
      - "both"
    """

    __tablename__ = "restricted_commands"

    guild_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    channel_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    command_name: Mapped[str] = mapped_column(String(64), primary_key=True)

    scope: Mapped[str] = mapped_column(
        String(16),
        default="both",
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
    )


# ─────────────────────────────────────
# COUNTING CHANNELS
# ─────────────────────────────────────
class CountingChannel(Base):
    __tablename__ = "counting_channels"

    guild_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    channel_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)

    current: Mapped[int] = mapped_column(Integer, default=0)
    last_user_id: Mapped[int | None] = mapped_column(
        BigInteger,
        nullable=True,
    )

    best: Mapped[int] = mapped_column(Integer, default=0)


# ─────────────────────────────────────
# TEMPBAN CONFIG
# ─────────────────────────────────────
class TempbanConfig(Base):
    __tablename__ = "tempban_config"

    guild_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    role_id: Mapped[int] = mapped_column(BigInteger, nullable=False)

    def __repr__(self) -> str:
        return f"<TempbanConfig guild={self.guild_id} role={self.role_id}>"


# ─────────────────────────────────────
# TEMPBAN RECORDS
# ─────────────────────────────────────
class TempbanRecord(Base):
    __tablename__ = "tempban_records"

    guild_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    user_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)

    moderator_id: Mapped[int] = mapped_column(BigInteger, nullable=False)

    reason: Mapped[str | None] = mapped_column(String(512))
    active: Mapped[bool] = mapped_column(Boolean, default=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
    )
    expires_at: Mapped[datetime | None] = mapped_column(DateTime)

    def __repr__(self) -> str:
        return (f"<TempbanRecord guild={self.guild_id} "
                f"user={self.user_id} active={self.active}>")


# ─────────────────────────────────────
# VERIFICATION CONFIG
# ─────────────────────────────────────
class VerificationConfig(Base):
    __tablename__ = "verification_config"

    guild_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)

    verify_channel_id: Mapped[int] = mapped_column(BigInteger)
    log_channel_id: Mapped[int] = mapped_column(BigInteger)

    verified_role_id: Mapped[int] = mapped_column(BigInteger)
    unverified_role_id: Mapped[int] = mapped_column(BigInteger)


# ─────────────────────────────────────
# MODERATION LOG CONFIG
# ─────────────────────────────────────
class ModerationLogConfig(Base):
    __tablename__ = "moderation_log_config"

    guild_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    channel_id: Mapped[int] = mapped_column(BigInteger, nullable=False)

    def __repr__(self) -> str:
        return (f"<ModerationLogConfig guild={self.guild_id} "
                f"channel={self.channel_id}>")
