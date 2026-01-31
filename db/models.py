from sqlalchemy import Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from db.base import Base


class AFK(Base):
    __tablename__ = "afk"

    guild_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    reason: Mapped[str] = mapped_column(String, nullable=False)
    since: Mapped[int] = mapped_column(Integer, nullable=False)


class AdminRole(Base):
    __tablename__ = "admin_roles"

    guild_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    role_id: Mapped[int] = mapped_column(Integer, primary_key=True)


class StickyMessage(Base):
    __tablename__ = "sticky_messages"

    guild_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    channel_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    content: Mapped[str] = mapped_column(Text)
    last_message_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    counter: Mapped[int] = mapped_column(Integer, default=0)


class DisabledCommand(Base):
    __tablename__ = "disabled_commands"

    guild_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    command_name: Mapped[str] = mapped_column(String(64), primary_key=True)
