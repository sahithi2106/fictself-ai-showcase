"""
FictSelf Bootstrap Schema Script
---------------------------------
Creates all tables in the connected database (local or Supabase) from the
current SQLAlchemy models.  Safe to run on an EMPTY database.

Usage (from backend/ directory):
    py -m uv run python scripts/bootstrap_schema.py

Requirements:
  - DATABASE_URL (or POSTGRES_* vars) must be set correctly in backend/.env
  - Run from the `backend/` directory so that `app` is importable
"""
import sys
import os

# Ensure the `backend/` directory is on the path so `app.*` imports work.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, inspect, text

# 1. Load settings — this reads DATABASE_URL / POSTGRES_* from .env
from app.core.config import settings

# 2. Import Base AND every model so they are registered in Base.metadata
import app.db.base  # noqa — side-effect: populates Base.metadata with all tables

from app.db.base_class import Base

DATABASE_URL = settings.SQLALCHEMY_DATABASE_URI
print(f"\n{'='*60}")
print(f"FictSelf Schema Bootstrap")
print(f"{'='*60}")
print(f"Target DB : {DATABASE_URL[:60]}...")
print()

engine = create_engine(DATABASE_URL, pool_pre_ping=True)

# 3. Verify connectivity before doing anything
try:
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
    print("[OK] Database connection successful.")
except Exception as e:
    print(f"[ERROR] Cannot connect to database:\n  {e}")
    print("\nCheck that DATABASE_URL in backend/.env is correct and the DB is reachable.")
    sys.exit(1)

# 4. Show what tables are registered in metadata (sanity check)
registered = sorted(Base.metadata.tables.keys())
print(f"\n[INFO] {len(registered)} tables registered in SQLAlchemy metadata:")
for t in registered:
    print(f"       - {t}")

# 5. Check which tables already exist in the DB
inspector = inspect(engine)
existing = set(inspector.get_table_names())
if existing:
    print(f"\n[WARN] The following tables already exist in the DB and will be SKIPPED:")
    for t in sorted(existing):
        print(f"       - {t}")
else:
    print(f"\n[INFO] Database is empty — all tables will be created fresh.")

# 6. Create all tables (create_all skips tables that already exist)
print("\n[INFO] Running Base.metadata.create_all() ...")
try:
    Base.metadata.create_all(bind=engine)
    print("[OK] Schema creation complete!")
except Exception as e:
    print(f"[ERROR] Schema creation failed:\n  {e}")
    sys.exit(1)

# 7. Final report
inspector2 = inspect(engine)
final_tables = sorted(inspector2.get_table_names())
print(f"\n{'='*60}")
print(f"RESULT: {len(final_tables)} tables now exist in the database:")
for t in final_tables:
    marker = "NEW" if t not in existing else "  -"
    print(f"  [{marker}] {t}")
print(f"{'='*60}\n")
print("Next step: register a user via POST /api/v1/auth/register to start using the app.")
