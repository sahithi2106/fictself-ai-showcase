"""add_character_bible_and_archived_at_to_stories

Revision ID: 5acafcf52fa1
Revises: b50f788b4c4e
Create Date: 2026-06-24 07:40:36.280551

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5acafcf52fa1'
down_revision: Union[str, None] = 'b50f788b4c4e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('stories', sa.Column('character_bible', sa.Text(), nullable=True))
    op.add_column('stories', sa.Column('archived_at', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column('stories', 'archived_at')
    op.drop_column('stories', 'character_bible')
