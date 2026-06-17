from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from sqlalchemy.pool import QueuePool
import os
from dotenv import load_dotenv

load_dotenv()

# Supports Neon, Railway PostgreSQL, and local PostgreSQL
# Also handles postgres:// → postgresql:// for Neon/Render URLs
_db_url = os.getenv("DATABASE_URL", "postgresql://postgres:password@localhost:5432/validation_platform")
DATABASE_URL = _db_url.replace("postgres://", "postgresql://", 1)

engine = create_engine(
    DATABASE_URL,
    poolclass=QueuePool,
    pool_size=5,
    max_overflow=10,
    pool_pre_ping=True,
    pool_recycle=300,
    echo=False,
    connect_args={"sslmode": "require"} if "neon.tech" in _db_url or "railway" in _db_url else {},
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def check_db_connection():
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception as e:
        print(f"DB connection failed: {e}")
        return False
