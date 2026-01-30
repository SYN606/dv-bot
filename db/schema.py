from db.engine import engine
from db.base import Base
import db.models  

def init_schema():
    Base.metadata.create_all(bind=engine)
