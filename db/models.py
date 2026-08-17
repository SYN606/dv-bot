from datetime import datetime
from enum import Enum as PyEnum
from typing import Optional

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
    false,
    func,
    true,
)
from sqlalchemy.orm import Mapped, mapped_column

from db.base import Base


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


# --- Mixins ---
class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


# --- Models ---
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


class AdminRole(Base):
    __tablename__ = "admin_roles"

    guild_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    role_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)

    __table_args__ = (CheckConstraint("guild_id > 0",
                                      name="chk_admin_role_guild"), )

    def __repr__(self) -> str:
        return f"<AdminRole guild={self.guild_id} role={self.role_id}>"


class MediaOnlyChannel(Base, TimestampMixin):
    __tablename__ = "media_only_channels"

    guild_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    channel_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    sticky_message_id: Mapped[Optional[int]] = mapped_column(BigInteger,
                                                             nullable=True)
    whitelist_role_id: Mapped[Optional[int]] = mapped_column(BigInteger,
                                                             nullable=True)
    image_only: Mapped[bool] = mapped_column(Boolean,
                                             nullable=False,
                                             server_default=false())
    auto_mute: Mapped[bool] = mapped_column(Boolean,
                                            nullable=False,
                                            server_default=false())
    nsfw_bypass: Mapped[bool] = mapped_column(Boolean,
                                              nullable=False,
                                              server_default=true())

    __table_args__ = (CheckConstraint("guild_id > 0",
                                      name="chk_media_guild_id"), )


class StickyMessage(Base, TimestampMixin):
    __tablename__ = "sticky_messages"

    guild_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    channel_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    sticky_content: Mapped[str] = mapped_column(Text, nullable=False)
    last_message_id: Mapped[Optional[int]] = mapped_column(BigInteger,
                                                           nullable=True)
    counter: Mapped[int] = mapped_column(Integer,
                                         nullable=False,
                                         server_default="0")

    __table_args__ = (CheckConstraint("counter >= 0",
                                      name="chk_sticky_counter"), )


class DisabledCommand(Base):
    __tablename__ = "disabled_commands"

    guild_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    command_name: Mapped[str] = mapped_column(String(64), primary_key=True)


class RestrictedCommand(Base):
    __tablename__ = "restricted_commands"

    guild_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    channel_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    command_name: Mapped[str] = mapped_column(String(64), primary_key=True)
    restriction_scope: Mapped[RestrictionScope] = mapped_column(
        Enum(
            RestrictionScope,
            native_enum=False,
            name="restriction_scope_enum",
        ),
        nullable=False,
        server_default=RestrictionScope.BOTH.value,
    )


class TempbanConfig(Base):
    __tablename__ = "tempban_config"

    guild_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    role_id: Mapped[int] = mapped_column(BigInteger, nullable=False)

    def __repr__(self) -> str:
        return f"<TempbanConfig guild={self.guild_id} role={self.role_id}>"


class TempbanRecord(Base, TimestampMixin):
    __tablename__ = "tempban_records"

    guild_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    user_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    moderator_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    tempban_reason: Mapped[Optional[str]] = mapped_column(String(512),
                                                          nullable=True)
    active: Mapped[bool] = mapped_column(Boolean,
                                         nullable=False,
                                         server_default=true())
    expires_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True)

    __table_args__ = (Index("idx_tempban_active_lookup", "guild_id",
                            "active"), Index("idx_tempban_expiry",
                                             "expires_at"))

    def __repr__(self) -> str:
        return f"<TempbanRecord guild={self.guild_id} user={self.user_id} active={self.active}>"


class VerificationConfig(Base, TimestampMixin):
    __tablename__ = "verification_config"

    guild_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    verify_channel_id: Mapped[Optional[int]] = mapped_column(BigInteger,
                                                             nullable=True)
    log_channel_id: Mapped[Optional[int]] = mapped_column(BigInteger,
                                                          nullable=True)
    verified_role_id: Mapped[Optional[int]] = mapped_column(BigInteger,
                                                            nullable=True)
    unverified_role_id: Mapped[Optional[int]] = mapped_column(BigInteger,
                                                              nullable=True)


class ModerationLogConfig(Base, TimestampMixin):
    __tablename__ = "moderation_log_config"

    guild_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    channel_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    enabled: Mapped[bool] = mapped_column(Boolean,
                                          nullable=False,
                                          server_default=true())

    def __repr__(self) -> str:
        return f"<ModerationLogConfig guild={self.guild_id} channel={self.channel_id}>"


class ChannelPermissionSnapshot(Base, TimestampMixin):
    __tablename__ = "channel_permission_snapshots"

    guild_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    channel_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    target_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    permission_name: Mapped[str] = mapped_column(String(64), primary_key=True)
    permission_value: Mapped[Optional[bool]] = mapped_column(Boolean,
                                                             nullable=True)


class WarningRecord(Base, TimestampMixin):
    __tablename__ = "warnings"

    warn_id: Mapped[int] = mapped_column(Integer,
                                         primary_key=True,
                                         autoincrement=True)
    guild_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    user_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    moderator_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    reason: Mapped[str] = mapped_column(String(512),
                                        nullable=False,
                                        server_default="No reason provided")

    __table_args__ = (Index("idx_warning_guild_user", "guild_id", "user_id"),
                      CheckConstraint("guild_id > 0",
                                      name="chk_warn_guild_id"),
                      CheckConstraint("user_id > 0", name="chk_warn_user_id"),
                      CheckConstraint("moderator_id > 0",
                                      name="chk_warn_mod_id"))

    def __repr__(self) -> str:
        return f"<WarningRecord id={self.warn_id} guild={self.guild_id} user={self.user_id}>"


class AutoResponder(Base, TimestampMixin):
    __tablename__ = "autoresponders"

    responder_id: Mapped[int] = mapped_column(Integer,
                                              primary_key=True,
                                              autoincrement=True)
    guild_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    trigger_phrase: Mapped[str] = mapped_column(String(256), nullable=False)
    match_type: Mapped[MatchType] = mapped_column(
        Enum(MatchType, native_enum=False, name="match_type_enum"),
        nullable=False,
        server_default=MatchType.CONTAINS.value)

    reply_content: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_embed: Mapped[bool] = mapped_column(Boolean,
                                           nullable=False,
                                           server_default=false())
    embed_title: Mapped[Optional[str]] = mapped_column(String(256),
                                                       nullable=True)
    image_url: Mapped[Optional[str]] = mapped_column(String(512),
                                                     nullable=True)
    enabled: Mapped[bool] = mapped_column(Boolean,
                                          nullable=False,
                                          server_default=true())
    ignore_bots: Mapped[bool] = mapped_column(Boolean,
                                              nullable=False,
                                              server_default=true())
    delete_trigger: Mapped[bool] = mapped_column(Boolean,
                                                 nullable=False,
                                                 server_default=false())
    cooldown: Mapped[int] = mapped_column(Integer,
                                          nullable=False,
                                          server_default="0")

    __table_args__ = (Index("idx_ar_guild_trigger", "guild_id", "enabled"),
                      CheckConstraint("guild_id > 0", name="chk_ar_guild_id"),
                      CheckConstraint("cooldown >= 0", name="chk_ar_cooldown"))


class AutoResponderReaction(Base):
    __tablename__ = "autoresponder_reactions"

    responder_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    emoji: Mapped[str] = mapped_column(String(64), primary_key=True)

    def __repr__(self) -> str:
        return f"<AutoResponderReaction id={self.responder_id} emoji={self.emoji}>"
