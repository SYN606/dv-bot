from sqlalchemy import (
    Integer,
    String,
    Text,
    BigInteger,
    DateTime,
    Index,
)
from sqlalchemy.orm import Mapped, mapped_column
from datetime import datetime

from db.base import Base


class AFK(Base):
    __tablename__ = "afk"

    guild_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    user_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)

    reason: Mapped[str] = mapped_column(String, nullable=False)
    since: Mapped[int] = mapped_column(Integer, nullable=False)

    __table_args__ = (Index("idx_afk_guild_user", "guild_id", "user_id"), )

    def __repr__(self) -> str:
        return f"<AFK guild={self.guild_id} user={self.user_id}>"


class AdminRole(Base):
    __tablename__ = "admin_roles"

    guild_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    role_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)

    __table_args__ = (Index("idx_admin_roles_guild", "guild_id"), )

    def __repr__(self) -> str:
        return f"<AdminRole guild={self.guild_id} role={self.role_id}>"


class MediaOnlyChannel(Base):
    __tablename__ = "media_only_channels"

    guild_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    channel_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
    )

    __table_args__ = (Index("idx_media_only_guild_channel", "guild_id",
                            "channel_id"), )

    def __repr__(self) -> str:
        return f"<MediaOnly guild={self.guild_id} channel={self.channel_id}>"


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

    __table_args__ = (Index("idx_sticky_guild_channel", "guild_id",
                            "channel_id"), )

    def __repr__(self) -> str:
        return f"<StickyMessage guild={self.guild_id} channel={self.channel_id}>"


class DisabledCommand(Base):
    __tablename__ = "disabled_commands"

    guild_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    command_name: Mapped[str] = mapped_column(String(64), primary_key=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
    )

    __table_args__ = (Index("idx_disabled_cmd_guild", "guild_id"), )

    def __repr__(self) -> str:
        return f"<DisabledCommand guild={self.guild_id} cmd={self.command_name}>"


class BotInstance(Base):
    __tablename__ = "bot_instances"

    instance_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    priority: Mapped[int] = mapped_column(Integer)  # lower = higher priority
    shard_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    shard_count: Mapped[int | None] = mapped_column(Integer, nullable=True)

    ping_ms: Mapped[int] = mapped_column(Integer)
    uptime_seconds: Mapped[int] = mapped_column(Integer)

    status: Mapped[str] = mapped_column(String(16))  # ready / dead
    last_heartbeat: Mapped[datetime] = mapped_column(DateTime)
