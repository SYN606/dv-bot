from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column
from db.base import Base


class AFK(Base):
    __tablename__ = "afk"

    guild_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    reason: Mapped[str] = mapped_column(String, nullable=False)
    since: Mapped[int] = mapped_column(Integer, nullable=False)
