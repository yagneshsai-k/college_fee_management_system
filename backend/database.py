import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, scoped_session

# Database location in the same directory as backend
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
DB_PATH = os.path.join(BASE_DIR, "college_fee.db")
DATABASE_URL = os.environ.get("DATABASE_URL", f"sqlite:///{DB_PATH}")
engine_options = {"pool_pre_ping": True}
if DATABASE_URL.startswith("sqlite"):
    engine_options["connect_args"] = {"check_same_thread": False}

engine = create_engine(DATABASE_URL, **engine_options)
SessionLocal = scoped_session(sessionmaker(autocommit=False, autoflush=False, bind=engine))

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
