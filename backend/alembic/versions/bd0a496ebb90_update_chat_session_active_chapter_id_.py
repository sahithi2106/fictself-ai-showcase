"""update chat_session active_chapter_id ondelete

Revision ID: bd0a496ebb90
Revises: e3ad2ccdabc9
Create Date: 2026-07-16 22:25:30.089003

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'bd0a496ebb90'
down_revision: Union[str, None] = 'e3ad2ccdabc9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Drop the old constraint if it exists. Note: The name might vary depending on previous migrations,
    # but SQLAlchemy defaults to tablename_columnname_fkey
    op.drop_constraint("chat_sessions_active_chapter_id_fkey", "chat_sessions", type_="foreignkey")
    op.create_foreign_key(
        "chat_sessions_active_chapter_id_fkey",
        "chat_sessions",
        "chapters",
        ["active_chapter_id"],
        ["id"],
        ondelete="SET NULL"
    )

def downgrade() -> None:
    op.drop_constraint("chat_sessions_active_chapter_id_fkey", "chat_sessions", type_="foreignkey")
    op.create_foreign_key(
        "chat_sessions_active_chapter_id_fkey",
        "chat_sessions",
        "chapters",
        ["active_chapter_id"],
        ["id"]
    )
