from sqlmodel import SQLModel, create_engine, Session

# Import models so SQLModel registers their tables before create_all runs.
from backend import models

sqlite_file_name = "database.db"
sqlite_url = f"sqlite:///{sqlite_file_name}"

connect_args = {"check_same_thread": False}
engine = create_engine(sqlite_url, connect_args=connect_args)

def create_db_and_tables():
    # Create any missing tables without deleting existing quiz data.
    SQLModel.metadata.create_all(engine)

def get_session():
    # FastAPI closes this database session after each request.
    with Session(engine) as session:
        yield session