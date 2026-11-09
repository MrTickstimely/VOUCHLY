import os
from sqlalchemy import MetaData, String, create_engine, event
from sqlalchemy.orm import DeclarativeBase, sessionmaker
#Importing sqlite3 to enable foreign key constraints for SQLite
#Sqlalchemy library is used to interact with the database and create the engine for database connection

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./vouchly.db")#path to the database is set to an environment variable DATABASE_URL, 
#if not found it defaults to a SQLite database named vouchly.db in the current directory.
IS_SQLITE = DATABASE_URL.startswith("sqlite")

engine = create_engine(
    DATABASE_URL, connect_args={"check_same_thread": False} if IS_SQLITE else {}
)#It creates a SQLAlchemy engine using the DATABASE_URL. If the database is SQLite,
#it adds a connection argument to allow multiple threads to access the database.

if IS_SQLITE:
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(conn, _):
        cursor = conn.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.execute("PRAGMA busy_timeout=3000")
        cursor.close()
#The above code sets up an event listener for the SQLite engine to enable foreign key constraints and configure other database settings when a connection is established.
# @event.listens_for(engine, "connect") is a decorator that registers the set_sqlite_pragma function to be called whenever a new connection is made to the SQLite database.
# The set_sqlite_pragma function executes several PRAGMA statements to configure the SQLite database:
# PRAGMA foreign_keys=ON: Enables foreign key constraints.
# PRAGMA journal_mode=WAL: Sets the journal mode to Write-Ahead Logging (WAL) for better concurrency.
# PRAGMA synchronous=NORMAL: Sets the synchronous mode to NORMAL for a balance between performance and durability.
# PRAGMA busy_timeout=3000: Sets a timeout of 3000 milliseconds for database operations to wait if the database is locked.
# I will kill myself

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
#Creates a session factory (SessionLocal) that will be used to create database sessions. The sessions are configured to not autocommit changes and not autoflush changes to the database automatically.

class Base(DeclarativeBase):
    type_annotation_map = {str: String(255)} #as you know it requires a length
    metadata = MetaData(naming_convention={
        "ix": "ix_%(table_name)s_%(column_0_name)s",
        "uq": "uq_%(table_name)s_%(column_0_name)s",
        "ck": "ck_%(table_name)s_%(constraint_name)s",
        "fk": "fk_%(table_name)s_%(column_0_name)s",
        "pk": "pk_%(table_name)s",
    })

#The above block of code defines a base class (Base) for SQLAlchemy models. It specifies a type annotation map to ensure that string columns have a maximum length of 255 characters. Additionally, it sets a naming convention for database constraints and indexes to maintain consistency across the database schema.
def get_db():
    with SessionLocal() as db:
        yield db
    
'''Why each part is there:

DATABASE_URL from the environment: your doc lists MySQL as well as SQLite, so moving later is a config change, not a rewrite. The IS_SQLite guards keep SQLite-only settings from breaking MySQL.
The three PRAGMAs: these are the three settings that most often cause problems on SQLite (silent FK violations, lock errors under concurrent requests).
naming_convention: it gives every constraint a stable name, which Alembic needs to alter or drop them later. It also keeps CHECK names unique per table, which MySQL requires.
get_db: this is the FastAPI dependency that guarantees each request closes its session.
'''