from typing import List
from db.engine import SessionLocal
from db.models import AdminRole


def add_admin_role(guild_id: int, role_id: int) -> bool:
    with SessionLocal() as session:
        exists = session.get(AdminRole, (guild_id, role_id))
        if exists:
            return False

        session.add(AdminRole(guild_id=guild_id, role_id=role_id))
        session.commit()
        return True


def remove_admin_role(guild_id: int, role_id: int) -> bool:
    with SessionLocal() as session:
        role = session.get(AdminRole, (guild_id, role_id))
        if not role:
            return False

        session.delete(role)
        session.commit()
        return True


def get_admin_roles(guild_id: int) -> List[int]:
    with SessionLocal() as session:
        rows = session.query(AdminRole).filter_by(guild_id=guild_id).all()
        return [r.role_id for r in rows]
